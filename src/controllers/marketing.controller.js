const prisma = require("../lib/prisma");

const marketingController = {
  /**
   * Create Marketing Content (Admin only)
   */
  createContent: async (req, res) => {
    console.log("[MarketingController] Incoming Body:", req.body);
    const { user_id: userId, tenant_id: tenantId, identity } = req.user;

    // Role validation
    const allowedRoles = ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"];
    if (!allowedRoles.includes(identity)) {
      return res.status(403).json({ success: false, message: "Unauthorized role for creating marketing content" });
    }

    const {
      type, title, content, imageUrl, mediaUrl, linkUrl, actionUrl,
      targetType, targetIdentity, targetUserId,
      targetStates, targetCities, targetPincodes
    } = req.body;

    const mediaLink = imageUrl || mediaUrl;
    if (!mediaLink) {
      return res.status(400).json({ success: false, message: "Media link (image or video URL) is mandatory" });
    }

    try {
      const marketing = await prisma.marketingContent.create({
        data: {
          type,
          title: title || "",
          content: content || "",
          imageUrl: mediaLink,
          linkUrl: linkUrl || actionUrl || "",
          targetType,
          targetIdentity,
          targetUserId,
          targetStates: targetStates || [],
          targetCities: targetCities || [],
          targetPincodes: targetPincodes || [],
          isActive: false, // starts as deactivated
          creatorId: userId,
          tenantId
        }
      });

      // Map back to frontend keys
      const mapped = {
        ...marketing,
        mediaUrl: marketing.imageUrl,
        actionUrl: marketing.linkUrl
      };

      res.status(201).json({ success: true, message: "Marketing content created", data: mapped });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Content for Current User (Targeted)
   */
  getContentForMe: async (req, res) => {
    const { user_id: userId, identity: myIdentity, tenant_id: tenantId } = req.user;

    try {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          path: true, 
          identity: true,
          registrationState: true,
          registrationCity: true,
          registrationPincode: true,
          memberProfile: { select: { currentCountry: true } },
          partnerProfile: { select: { currentCountry: true } }
        }
      });

      if (!me) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Find all active marketing content for this tenant
      const allContent = await prisma.marketingContent.findMany({
        where: {
          tenantId,
          isActive: true,
          isGlobalDeactivated: false
        },
        include: {
          creator: { select: { path: true, identity: true } }
        }
      });

      const now = new Date();

      // Filter content based on hierarchical targeting rules
      const myContent = allContent.filter(item => {
        // 1. Hierarchy Check: Is the creator above me in the tree?
        // SUPER_ADMIN banners are visible tenant-wide.
        // WHITE_LABEL_ADMIN is the root — their banners reach all users in the tenant.
        // For other creators, the creator's ID must appear in the user's ancestor path.
        const creatorIdentity = item.creator?.identity;
        const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
        const isWhiteLabelAdmin = creatorIdentity === 'WHITE_LABEL_ADMIN';
        const isSelf = item.creatorId === userId;
        const isInPath = me.path && me.path.includes(item.creatorId);

        const isCreatorAbove = isSuperAdmin || isWhiteLabelAdmin || isSelf || isInPath;
        
        if (!isCreatorAbove) return false;

        // 2. Validity Schedule Check
        if (item.startDate && now < new Date(item.startDate)) return false;
        if (item.endDate && now > new Date(item.endDate)) return false;

        // 3. Targeting Check
        switch (item.targetType) {
          case 'ALL':
            return true;
          case 'IDENTITY':
            return myIdentity === item.targetIdentity;
          case 'BRANCH':
            // Target specific branch: Me or someone in my path must be the targetUserId
            return userId === item.targetUserId || (me.path && me.path.includes(item.targetUserId));
          case 'SPECIFIC':
            return userId === item.targetUserId;
          case 'LOCATION': {
            // Country filter
            if (item.targetCountries && item.targetCountries.length > 0) {
              const userCountry = me.memberProfile?.currentCountry || me.partnerProfile?.currentCountry || "India";
              if (!item.targetCountries.includes(userCountry)) return false;
            }
            // State filter
            if (item.targetStates && item.targetStates.length > 0) {
              const userState = me.registrationState;
              if (!userState || !item.targetStates.includes(userState)) return false;
            }
            // City filter (targetCities from create form, targetDistricts from activation modal)
            const cityTargets = [...(item.targetCities || []), ...(item.targetDistricts || [])];
            if (cityTargets.length > 0) {
              const userCity = me.registrationCity;
              if (!userCity || !cityTargets.includes(userCity)) return false;
            }
            // Pincode filter
            if (item.targetPincodes && item.targetPincodes.length > 0) {
              const userPincode = me.registrationPincode;
              if (!userPincode || !item.targetPincodes.includes(userPincode)) return false;
            }
            return true;
          }
          default:
            return false;
        }
      });

      // Map back to frontend keys
      const mappedContent = myContent.map(item => ({
        ...item,
        mediaUrl: item.imageUrl,
        actionUrl: item.linkUrl
      }));

      res.json({ success: true, data: mappedContent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin: List my created content
   */
  getMyContent: async (req, res) => {
    const { user_id: userId } = req.user;
    try {
      const content = await prisma.marketingContent.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' }
      });

      // Map back to frontend keys
      const mappedContent = content.map(item => ({
        ...item,
        mediaUrl: item.imageUrl,
        actionUrl: item.linkUrl
      }));

      res.json({ success: true, data: mappedContent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin: Update/Toggle/Configure content
   */
  updateContent: async (req, res) => {
    const { user_id: userId, identity } = req.user;
    const { id } = req.params;
    const { 
      isActive, title, content, imageUrl, mediaUrl, linkUrl, actionUrl,
      targetType, targetIdentity, targetUserId,
      targetCountries, targetStates, targetCities, targetDistricts, targetPincodes,
      startDate, endDate
    } = req.body;

    try {
      const existing = await prisma.marketingContent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "Marketing content not found" });
      }

      // Allow updates if creator is the user, or if super admin
      if (existing.creatorId !== userId && identity !== "SUPER_ADMIN") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      // Map media URLs
      const mediaLink = imageUrl !== undefined ? imageUrl : (mediaUrl !== undefined ? mediaUrl : undefined);
      const actionLink = linkUrl !== undefined ? linkUrl : (actionUrl !== undefined ? actionUrl : undefined);

      const updateData = {};
      if (isActive !== undefined) updateData.isActive = isActive;
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (mediaLink !== undefined) updateData.imageUrl = mediaLink;
      if (actionLink !== undefined) updateData.linkUrl = actionLink;
      
      if (targetType !== undefined) updateData.targetType = targetType;
      if (targetIdentity !== undefined) updateData.targetIdentity = targetIdentity;
      if (targetUserId !== undefined) updateData.targetUserId = targetUserId;
      
      if (targetCountries !== undefined) updateData.targetCountries = targetCountries;
      if (targetStates !== undefined) updateData.targetStates = targetStates;
      if (targetCities !== undefined) updateData.targetCities = targetCities;
      if (targetDistricts !== undefined) updateData.targetDistricts = targetDistricts;
      if (targetPincodes !== undefined) updateData.targetPincodes = targetPincodes;

      if (startDate !== undefined) {
        updateData.startDate = startDate ? new Date(startDate) : null;
      }
      if (endDate !== undefined) {
        updateData.endDate = endDate ? new Date(endDate) : null;
      }

      const updated = await prisma.marketingContent.update({
        where: { id },
        data: updateData
      });

      // Map back to frontend keys
      const mapped = {
        ...updated,
        mediaUrl: updated.imageUrl,
        actionUrl: updated.linkUrl
      };

      res.json({ success: true, message: "Marketing content updated successfully", data: mapped });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Super Admin: Master Deactivation
   */
  superAdminToggle: async (req, res) => {
    const { identity } = req.user;
    const { id } = req.params;
    const { isGlobalDeactivated } = req.body;

    if (identity !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: "Only Super Admin can perform this action" });
    }

    try {
      const updated = await prisma.marketingContent.update({
        where: { id },
        data: { isGlobalDeactivated }
      });

      const mapped = {
        ...updated,
        mediaUrl: updated.imageUrl,
        actionUrl: updated.linkUrl
      };

      res.json({ success: true, message: "Global status updated", data: mapped });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Super Admin: List all marketing content for review
   */
  superAdminListAll: async (req, res) => {
    const { identity } = req.user;
    if (identity !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    try {
      const all = await prisma.marketingContent.findMany({
        include: { creator: { select: { fullName: true, identity: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Map back to frontend keys
      const mappedContent = all.map(item => ({
        ...item,
        mediaUrl: item.imageUrl,
        actionUrl: item.linkUrl
      }));

      res.json({ success: true, data: mappedContent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin: Delete their own marketing content
   */
  deleteContent: async (req, res) => {
    const { user_id: userId, identity } = req.user;
    const { id } = req.params;

    try {
      const existing = await prisma.marketingContent.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "Marketing content not found" });
      }

      // Allow deletion if creator is the user, or if super admin
      if (existing.creatorId !== userId && identity !== "SUPER_ADMIN") {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      await prisma.marketingContent.delete({ where: { id } });

      res.json({ success: true, message: "Marketing content deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = marketingController;
