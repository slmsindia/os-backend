const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const { ROLE_HIERARCHY, getHierarchyChain, getDescendants } = require("../middleware/hierarchy.middleware");

const prisma = new PrismaClient();

const hierarchyController = {
  // Get hierarchy info for current user
  getMyHierarchy: async (req, res) => {
    const { user_id: userId, role: singleRole, roles: roleArray } = req.user;
    const roles = roleArray || [singleRole];
    const role = roles.includes("ADMIN") ? "ADMIN" : 
                 roles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : 
                 singleRole;

    try {
      const [chain, descendants] = await Promise.all([
        getHierarchyChain(userId),
        getDescendants(userId)
      ]);

      const myHierarchy = ROLE_HIERARCHY[role] || null;

      return res.json({
        success: true,
        myRole: role,
        myLevel: myHierarchy?.level,
        canCreate: myHierarchy?.canCreate || [],
        myHierarchyChain: chain,
        myTeam: descendants
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Create user in hierarchy
  createHierarchyUser: async (req, res) => {
    const { mobile, fullName, password, gender, dateOfBirth, identity, parentId } = req.body;
    const { user_id: myId, role: singleRole, roles: roleArray, tenant_id: tenantId } = req.user;
    
    // Use roles array if available, otherwise fall back to single role
    const myRoles = roleArray || [singleRole];
    // For hierarchy checks, use the highest privilege role
    const myRole = myRoles.includes("ADMIN") ? "ADMIN" : 
                   myRoles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : 
                   singleRole;

    // Validate required fields
    if (!mobile || !fullName || !password || !identity) {
      return res.status(400).json({
        success: false,
        message: "Mobile, fullName, password, and identity are required"
      });
    }

    // Check if the target identity is valid
    const myHierarchy = ROLE_HIERARCHY[myRole];
    if (!myHierarchy) {
      return res.status(403).json({
        success: false,
        message: `Unknown role: ${myRole}`
      });
    }

    // Check if current role can create the target identity
    if (!myHierarchy.canCreate.includes(identity)) {
      return res.status(403).json({
        success: false,
        message: `${myRole} cannot create ${identity}. Allowed: ${myHierarchy.canCreate.join(", ")}`
      });
    }

    try {
      // Determine parentId - default to current user
      let finalParentId = myId;

      // If explicit parentId provided, verify it's under current user's hierarchy
      if (parentId) {
        if (parentId !== myId) {
          const parent = await prisma.user.findFirst({
            where: { id: parentId, tenantId }
          });

          if (!parent) {
            return res.status(400).json({
              success: false,
              message: "Invalid parentId for this tenant"
            });
          }

          // Check if the provided parentId is a descendant of current user
          const isDescendant = await checkTreeRecursive(myId, parentId);
          if (!isDescendant) {
            return res.status(403).json({
              success: false,
              message: "You can only assign users under your hierarchy"
            });
          }
        }
        finalParentId = parentId;
      }

      // Check if mobile already exists
      const existingUser = await prisma.user.findUnique({
        where: { mobile }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Mobile number already registered"
        });
      }

      // Hash password
      const hash = await bcrypt.hash(password, 10);

      // Build create data
      const createData = {
        id: generateUuid(),
        mobile,
        fullName,
        password: hash,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date("1990-01-01"),
        identity,
        tenant: { connect: { id: tenantId } }
      };
      
      // Add parent relation if provided
      if (finalParentId) {
        createData.parent = { connect: { id: finalParentId } };
      }
      
      // Add creator relation if provided
      if (myId) {
        createData.creator = { connect: { id: myId } };
      }
      
      // Create user
      const user = await prisma.user.create({ data: createData });

      // Log action
      await logAction({
        userId: myId,
        action: `CREATE_${identity}`,
        targetId: user.id,
        tenantId,
        metadata: { mobile: user.mobile, identity, parentId: finalParentId }
      });

      return res.status(201).json({
        success: true,
        message: `${identity} created successfully`,
        user: {
          id: user.id,
          mobile: user.mobile,
          fullName: user.fullName,
          identity: user.identity,
          parentId: user.parentId
        }
      });
    } catch (err) {
      console.error("Create hierarchy user error:", err);
      if (err.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Mobile number already exists"
        });
      }
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get users created by me
  getMyTeam: async (req, res) => {
    const { user_id: userId, role } = req.user;
    const { identity, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        parentId: userId
      };

      if (identity) {
        where.identity = identity;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            mobile: true,
            fullName: true,
            identity: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit)
        }),
        prisma.user.count({ where })
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        users
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get hierarchy structure
  getHierarchyStructure: async (req, res) => {
    return res.json({
      success: true,
      hierarchy: ROLE_HIERARCHY
    });
  },

  // Get full tree under current user
  getMyTree: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const tree = await buildTree(userId);

      return res.json({
        success: true,
        tree
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

// Helper: Check if childId is a descendant of parentId
const checkTreeRecursive = async (parentId, childId) => {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parentId: true }
  });

  if (!child || !child.parentId) return false;
  if (child.parentId === parentId) return true;

  return await checkTreeRecursive(parentId, child.parentId);
};

// Helper: Build full tree structure
const buildTree = async (parentId) => {
  const user = await prisma.user.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      fullName: true,
      identity: true,
      mobile: true,
      isActive: true
    }
  });

  if (!user) return null;

  const children = await prisma.user.findMany({
    where: { parentId },
    select: { id: true }
  });

  const childTrees = await Promise.all(
    children.map(child => buildTree(child.id))
  );

  return {
    ...user,
    children: childTrees.filter(Boolean)
  };
};

module.exports = hierarchyController;
