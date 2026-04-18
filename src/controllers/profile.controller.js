const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const profileController = {
  // Get user profile with job matching info
  getProfile: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        include: {
          profile: true,
          roles: { include: { role: true } },
          wallet: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          mobile: user.mobile,
          fullName: user.fullName,
          gender: user.gender,
          dateOfBirth: user.dateOfBirth,
          identity: user.identity,
          approvalStatus: user.approvalStatus,
          roles: user.roles.map((r) => r.role.name),
          wallet: user.wallet
            ? {
                id: user.wallet.id,
                balance: user.wallet.balance,
              }
            : null,
          profile: user.profile,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Create or update user profile
  upsertProfile: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const {
      title,
      bio,
      experience,
      address,
      city,
      state,
      country,
      pincode,
      skills,
      education,
      preferredLocation,
      preferredSalary,
    } = req.body;

    try {
      // Validate skills array
      if (skills && !Array.isArray(skills)) {
        return res.status(400).json({
          success: false,
          message: "Skills must be an array",
        });
      }

      // Validate experience
      if (experience !== undefined && (typeof experience !== "number" || experience < 0)) {
        return res.status(400).json({
          success: false,
          message: "Experience must be a positive number",
        });
      }

      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          title: title || undefined,
          bio: bio || undefined,
          experience: experience !== undefined ? experience : undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          country: country || undefined,
          pincode: pincode || undefined,
          skills: skills || undefined,
          education: education || undefined,
          preferredLocation: preferredLocation || undefined,
          preferredSalary: preferredSalary !== undefined ? preferredSalary : undefined,
        },
        create: {
          id: generateUuid(),
          userId,
          title: title || null,
          bio: bio || null,
          experience: experience || 0,
          address: address || null,
          city: city || null,
          state: state || null,
          country: country || null,
          pincode: pincode || null,
          skills: skills || [],
          education: education || null,
          preferredLocation: preferredLocation || [],
          preferredSalary: preferredSalary || null,
        },
      });

      await logAction({
        userId,
        action: "PROFILE_UPDATED",
        tenantId,
        metadata: { hasSkills: skills?.length > 0, experience },
      });

      return res.json({
        success: true,
        message: "Profile saved successfully",
        profile,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Add skills to profile
  addSkills: async (req, res) => {
    const { user_id: userId } = req.user;
    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Skills array is required",
      });
    }

    try {
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      let profile;
      if (existingProfile) {
        // Merge existing skills with new ones (avoid duplicates)
        const updatedSkills = [...new Set([...existingProfile.skills, ...skills])];
        profile = await prisma.userProfile.update({
          where: { userId },
          data: { skills: updatedSkills },
        });
      } else {
        profile = await prisma.userProfile.create({
          data: {
            id: generateUuid(),
            userId,
            skills,
            experience: 0,
          },
        });
      }

      return res.json({
        success: true,
        message: "Skills added successfully",
        skills: profile.skills,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Remove skills from profile
  removeSkills: async (req, res) => {
    const { user_id: userId } = req.user;
    const { skills } = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Skills array is required",
      });
    }

    try {
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }

      const updatedSkills = existingProfile.skills.filter((s) => !skills.includes(s));
      const profile = await prisma.userProfile.update({
        where: { userId },
        data: { skills: updatedSkills },
      });

      return res.json({
        success: true,
        message: "Skills removed successfully",
        skills: profile.skills,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update location preferences
  updateLocation: async (req, res) => {
    const { user_id: userId } = req.user;
    const { address, city, state, country, pincode, preferredLocation } = req.body;

    try {
      const profile = await prisma.userProfile.upsert({
        where: { userId },
        update: {
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          country: country || undefined,
          pincode: pincode || undefined,
          preferredLocation: preferredLocation || undefined,
        },
        create: {
          id: generateUuid(),
          userId,
          address: address || null,
          city: city || null,
          state: state || null,
          country: country || null,
          pincode: pincode || null,
          preferredLocation: preferredLocation || [],
          experience: 0,
          skills: [],
        },
      });

      return res.json({
        success: true,
        message: "Location updated successfully",
        location: {
          address: profile.address,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          pincode: profile.pincode,
          preferredLocation: profile.preferredLocation,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Add education
  addEducation: async (req, res) => {
    const { user_id: userId } = req.user;
    const { degree, institution, year, fieldOfStudy } = req.body;

    if (!degree || !institution) {
      return res.status(400).json({
        success: false,
        message: "Degree and institution are required",
      });
    }

    try {
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      const newEducation = { degree, institution, year, fieldOfStudy };

      let profile;
      if (existingProfile) {
        const education = Array.isArray(existingProfile.education)
          ? existingProfile.education
          : [];
        education.push(newEducation);
        profile = await prisma.userProfile.update({
          where: { userId },
          data: { education },
        });
      } else {
        profile = await prisma.userProfile.create({
          data: {
            id: generateUuid(),
            userId,
            education: [newEducation],
            experience: 0,
            skills: [],
          },
        });
      }

      return res.json({
        success: true,
        message: "Education added successfully",
        education: profile.education,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Delete profile
  deleteProfile: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      await prisma.userProfile.delete({
        where: { userId },
      });

      await logAction({
        userId,
        action: "PROFILE_DELETED",
      });

      return res.json({
        success: true,
        message: "Profile deleted successfully",
      });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = profileController;
