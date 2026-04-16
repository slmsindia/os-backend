const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

<<<<<<< HEAD
// Role hierarchy definition
// Each role can only create the roles listed in canCreate
// NOTE: USER and MEMBER are created through registration/upgrade process, not by hierarchy
const ROLE_HIERARCHY = {
  SUPER_ADMIN: {
    level: 0,
    canCreate: ["ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_HEAD", "DISTRICT_PARTNER", "AGENT", "MEMBER", "USER"]
  },
  ADMIN: {
    level: 1,
    canCreate: ["SUB_ADMIN", "COUNTRY_HEAD", "STATE_HEAD", "DISTRICT_PARTNER", "AGENT", "MEMBER", "USER"]
  },
  SUB_ADMIN: {
    level: 2,
    canCreate: ["COUNTRY_HEAD", "STATE_HEAD", "DISTRICT_PARTNER"]
  },
  COUNTRY_HEAD: {
    level: 3,
    canCreate: ["STATE_HEAD", "DISTRICT_PARTNER"]
  },
  STATE_HEAD: {
    level: 4,
    canCreate: ["DISTRICT_PARTNER"]
  },
  DISTRICT_PARTNER: {
    level: 5,
    canCreate: [] // Cannot create AGENT directly - AGENTs are created through upgrade process
  },
  AGENT: {
    level: 6,
    canCreate: [] // Cannot create USER/MEMBER directly - they register and upgrade
  }
};

// Legacy middleware - checks if target user is in the hierarchy tree
const hierarchyCheck = async (req, res, next) => {
  const { id: targetId } = req.params;
  const { user_id: myId, role: myRole } = req.user;

  if (myRole === "ADMIN" || myRole === "SUPER_ADMIN") return next();
=======
module.exports = async (req, res, next) => {
  const { id: targetId } = req.params;
  const { user_id: myId, role: myRole } = req.user;

  if (myRole === "ADMIN") return next();
>>>>>>> origin/hemraj
  if (!targetId || targetId === myId) return next();

  try {
    const isChild = await checkTree(myId, targetId);
    if (!isChild) return res.status(403).json({ message: "denied" });

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "error" });
  }
};

<<<<<<< HEAD
// New middleware - enforces strict role-based creation hierarchy
const enforceHierarchy = (allowedRoles = []) => {
  return async (req, res, next) => {
    const { user_id: myId, role: myRole, tenant_id: tenantId } = req.user;
    const { parentId, identity: targetIdentity } = req.body;

    try {
      // SUPER_ADMIN and ADMIN bypass hierarchy for certain operations
      if (myRole === "SUPER_ADMIN" || myRole === "ADMIN") {
        return next();
      }

      // Check if current user's role is allowed to perform this action
      if (allowedRoles.length > 0 && !allowedRoles.includes(myRole)) {
        return res.status(403).json({
          success: false,
          message: `Role '${myRole}' is not authorized for this operation`
        });
      }

      // Get user's hierarchy info
      const myHierarchy = ROLE_HIERARCHY[myRole];
      if (!myHierarchy) {
        return res.status(403).json({
          success: false,
          message: `Unknown role: ${myRole}`
        });
      }

      // If creating a new user, check if current role can create that identity
      if (targetIdentity) {
        if (!myHierarchy.canCreate.includes(targetIdentity)) {
          return res.status(403).json({
            success: false,
            message: `${myRole} cannot create ${targetIdentity}. Allowed: ${myHierarchy.canCreate.join(", ")}`
          });
        }
      }

      // If parentId is provided, verify it's the current user or their descendant
      if (parentId && parentId !== myId) {
        const isDescendant = await checkTree(myId, parentId);
        if (!isDescendant) {
          return res.status(403).json({
            success: false,
            message: "You can only assign users under your hierarchy"
          });
        }
      }

      next();
    } catch (err) {
      console.error("Hierarchy middleware error:", err);
      res.status(500).json({ success: false, message: "Hierarchy check failed" });
    }
  };
};

// Check if childId is a descendant of parentId in the hierarchy tree
=======
>>>>>>> origin/hemraj
const checkTree = async (parentId, childId) => {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parentId: true }
  });

  if (!child || !child.parentId) return false;
  if (child.parentId === parentId) return true;

  return await checkTree(parentId, child.parentId);
};
<<<<<<< HEAD

// Get full hierarchy chain for a user
const getHierarchyChain = async (userId) => {
  const chain = [];
  let currentId = userId;
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const user = await prisma.user.findUnique({
      where: { id: currentId },
      select: { id: true, fullName: true, identity: true, parentId: true }
    });

    if (!user) break;

    chain.unshift({
      id: user.id,
      name: user.fullName,
      identity: user.identity
    });

    currentId = user.parentId;
    depth++;
  }

  return chain;
};

// Get all descendants for a user
const getDescendants = async (userId) => {
  const descendants = [];
  
  const findChildren = async (parentId) => {
    const children = await prisma.user.findMany({
      where: { parentId },
      select: { id: true, fullName: true, identity: true, mobile: true }
    });

    for (const child of children) {
      descendants.push(child);
      await findChildren(child.id);
    }
  };

  await findChildren(userId);
  return descendants;
};

module.exports = {
  hierarchyCheck,
  enforceHierarchy,
  checkTree,
  getHierarchyChain,
  getDescendants,
  ROLE_HIERARCHY
};
=======
>>>>>>> origin/hemraj
