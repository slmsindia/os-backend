const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const commissionService = {
  /**
   * Cascading Commission Logic with Full Transaction History (Debit & Credit)
   * Includes Joiner Name in descriptions for better transparency.
   */
  processCommission: async (transactionAmount, subServiceId, userId, customDescription = null, tx = prisma) => {
    console.log(`[Commission] >>> STARTING CASCADING: User=${userId}, SubService=${subServiceId}`);
    
    try {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, path: true, tenantId: true }
      });

      if (!user) return { success: false, message: "User not found" };
      const joinerName = user.fullName || "User";

      // Fetch subservice info for better descriptions
      const subService = await tx.commissionSubService.findUnique({
        where: { id: subServiceId },
        select: { name: true, slug: true }
      });
      const serviceLabel = subService?.name || "Service";
      const isTransfer = subService?.slug?.includes('transfer');

      // --- LOCATION BASED SCHEME LOOKUP ---
      let locationScheme = null;
      try {
        const joiner = await tx.user.findUnique({
          where: { id: userId },
          select: { registrationPincode: true, registrationCity: true, registrationState: true, tenantId: true }
        });

        if (joiner) {
          console.log(`[Commission] Joiner Location Data: Pincode=${joiner.registrationPincode}, City=${joiner.registrationCity}, State=${joiner.registrationState}`);
          
          // Priority: Pincode > City > State
          locationScheme = await tx.commissionScheme.findFirst({
            where: {
              tenantId: joiner.tenantId,
              isActive: true,
              OR: [
                { targetPincode: { equals: joiner.registrationPincode, not: null } },
                { targetCity: { equals: joiner.registrationCity, not: null } },
                { targetState: { equals: joiner.registrationState, not: null } }
              ]
            },
            orderBy: [
              { targetPincode: 'desc' }, 
              { targetCity: 'desc' },
              { targetState: 'desc' }
            ]
          });
          
          if (locationScheme) {
            console.log(`[Commission] LOCATION OVERRIDE FOUND: ${locationScheme.name} (ID: ${locationScheme.id})`);
          } else {
            console.log(`[Commission] No location-specific scheme found for this joiner.`);
          }
        }
      } catch (locErr) {
        console.error("[Commission] Location lookup failed:", locErr);
      }

      const rawPathIds = user.path ? user.path.split('/').filter(id => id && id.length > 5) : [];
      
      const adminUser = await tx.user.findFirst({
        where: {
          tenantId: user.tenantId,
          identity: { in: ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"] }
        },
        orderBy: { createdAt: 'asc' }
      });

      const pathIds = [...rawPathIds];
      if (adminUser && !pathIds.includes(adminUser.id)) {
          pathIds.unshift(adminUser.id);
      }

      if (pathIds.length < 2) {
          console.log("[Commission] SKIP: No partners in path");
          return { success: true };
      }

      const pathUsers = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true, commissionSchemeId: true, fullName: true, tenantId: true }
      });

      const hierarchy = pathIds.map(id => pathUsers.find(u => u.id === id)).filter(Boolean);
      console.log(`[Commission] Hierarchy resolved: ${hierarchy.map(u => `${u.fullName} (${u.identity})`).join(' -> ')}`);

      const transactionLog = await tx.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: "SUCCESS"
        }
      });
      console.log(`[Commission] Created TransactionLog ID: ${transactionLog.id}`);

      const adminCorporateWallet = await tx.wallet.findFirst({
        where: { tenantId: user.tenantId, isCorporate: true }
      });
      console.log(`[Commission] Admin Corporate Wallet ID: ${adminCorporateWallet?.id || "NOT FOUND"}`);

      for (let i = 0; i < hierarchy.length - 1; i++) {
          const sender = hierarchy[i];
          const receiver = hierarchy[i + 1];

          console.log(`[Commission] --- STEP ${i+1}: ${sender.fullName} -> ${receiver.fullName} ---`);

          let transferAmount = 0;
          let resolvedBy = "";

          const recIdentity = receiver.identity.toUpperCase();
          let shareKey = "";
          if (recIdentity.includes("COUNTRY")) shareKey = "countryPartner";
          else if (recIdentity.includes("STATE")) shareKey = "statePartner";
          else if (recIdentity.includes("DISTRICT")) shareKey = "districtPartner";
          else if (recIdentity.includes("SAATHI")) shareKey = "saathi";
          else if (recIdentity.includes("MEMBER")) shareKey = "member";

          console.log(`[Commission]   Receiver Identity: ${recIdentity}, ShareKey: ${shareKey}`);
          if (!shareKey) {
            console.log(`[Commission]   SKIP: Identity ${recIdentity} not mapped to any share key.`);
            continue;
          }

          // 1. Closest Upstream Partner Override
          for (let j = i; j >= 0; j--) {
              const upstreamPartner = hierarchy[j];
              const schemeId = upstreamPartner.commissionSchemeId;
              console.log(`[Commission]   Checking Upstream: ${upstreamPartner.fullName}, SchemeID: ${schemeId || "None"}`);
              
              if (schemeId) {
                  let share = await tx.commissionShare.findUnique({
                      where: { schemeId_subServiceId: { schemeId, subServiceId } }
                  });

                  // BUG FIX: If ID doesn't match this scheme, try finding by slug OR name
                  if (!share) {
                      const equivalentSubService = await tx.commissionSubService.findFirst({
                          where: { 
                            schemeId: schemeId,
                            OR: [
                                (subService?.slug ? { slug: subService.slug } : null),
                                (subService?.name ? { name: subService.name } : null)
                            ].filter(Boolean)
                          }
                      });
                      if (equivalentSubService) {
                          share = await tx.commissionShare.findUnique({
                              where: { schemeId_subServiceId: { schemeId, subServiceId: equivalentSubService.id } }
                          });
                          if (share) console.log(`[Commission]   Found equivalent SubService ${equivalentSubService.id} via ${subService.slug ? 'slug' : 'name'} in Upstream Scheme.`);
                      }
                  }
                  
                  if (share && parseFloat(share[shareKey]) > 0) {
                      const val = parseFloat(share[shareKey]);
                      transferAmount = share.commissionType === 1 ? (transactionAmount * val) / 100 : val;
                      resolvedBy = upstreamPartner.fullName;
                      console.log(`[Commission]   MATCH Upstream Scheme! Share found for ${shareKey}. Type: ${share.commissionType === 1 ? 'Percent' : 'Flat'}, Value: ${val}, Final Amount: ${transferAmount}`);
                      break; 
                  } else {
                      console.log(`[Commission]   No valid share found in Upstream Scheme for ${shareKey} (Value: ${share ? share[shareKey] : 'NULL'})`);
                  }
              }
          }

          // 2. Location-Based Scheme Fallback
          if (transferAmount <= 0 && locationScheme) {
              console.log(`[Commission]   Trying Location Scheme: ${locationScheme.name}`);
              let share = await tx.commissionShare.findUnique({
                  where: { schemeId_subServiceId: { schemeId: locationScheme.id, subServiceId } }
              });

              // BUG FIX: If ID doesn't match this scheme, try finding by slug OR name
              if (!share) {
                  const equivalentSubService = await tx.commissionSubService.findFirst({
                      where: { 
                        schemeId: locationScheme.id,
                        OR: [
                            (subService?.slug ? { slug: subService.slug } : null),
                            (subService?.name ? { name: subService.name } : null)
                        ].filter(Boolean)
                      }
                  });
                  if (equivalentSubService) {
                      share = await tx.commissionShare.findUnique({
                          where: { schemeId_subServiceId: { schemeId: locationScheme.id, subServiceId: equivalentSubService.id } }
                      });
                      if (share) console.log(`[Commission]   Found equivalent SubService ${equivalentSubService.id} via ${subService.slug ? 'slug' : 'name'} in Location Scheme.`);
                  }
              }

              if (share && parseFloat(share[shareKey]) > 0) {
                  const val = parseFloat(share[shareKey]);
                  transferAmount = share.commissionType === 1 ? (transactionAmount * val) / 100 : val;
                  resolvedBy = `Location Override (${locationScheme.name})`;
                  console.log(`[Commission]   MATCH Location Scheme! Share found for ${shareKey}. Type: ${share.commissionType === 1 ? 'Percent' : 'Flat'}, Value: ${val}, Final Amount: ${transferAmount}`);
              } else {
                  console.log(`[Commission]   No valid share found in Location Scheme for ${shareKey} (Value: ${share ? share[shareKey] : 'NULL'})`);
              }
          }

          // 3. Global Default Fallback
          if (transferAmount <= 0) {
              console.log(`[Commission]   Trying System Default Scheme...`);
              let defaultScheme = await tx.commissionScheme.findFirst({
                  where: { tenantId: user.tenantId, isActive: true, isDefault: true }
              });

              // Fallback 1: Look for scheme named "General"
              if (!defaultScheme) {
                  defaultScheme = await tx.commissionScheme.findFirst({
                      where: { 
                          tenantId: user.tenantId, 
                          isActive: true, 
                          name: { contains: 'General', mode: 'insensitive' } 
                      }
                  });
              }

              // Fallback 2: Pick the first active scheme
              if (!defaultScheme) {
                  defaultScheme = await tx.commissionScheme.findFirst({
                      where: { tenantId: user.tenantId, isActive: true },
                      orderBy: { createdAt: 'asc' }
                  });
              }

              if (defaultScheme) {
                  console.log(`[Commission]   Default/Fallback Scheme Found: ${defaultScheme.name} (ID: ${defaultScheme.id})`);
                  let share = await tx.commissionShare.findUnique({
                      where: { schemeId_subServiceId: { schemeId: defaultScheme.id, subServiceId } }
                  });

                  // BUG FIX: If ID doesn't match this scheme, try finding by slug OR name
                  if (!share) {
                      const equivalentSubService = await tx.commissionSubService.findFirst({
                          where: { 
                            schemeId: defaultScheme.id,
                            OR: [
                                (subService?.slug ? { slug: subService.slug } : null),
                                (subService?.name ? { name: subService.name } : null)
                            ].filter(Boolean)
                          }
                      });
                      if (equivalentSubService) {
                          share = await tx.commissionShare.findUnique({
                              where: { schemeId_subServiceId: { schemeId: defaultScheme.id, subServiceId: equivalentSubService.id } }
                          });
                          if (share) console.log(`[Commission]   Found equivalent SubService ${equivalentSubService.id} via ${subService.slug ? 'slug' : 'name'} in Default Scheme.`);
                      }
                  }

                  if (share && parseFloat(share[shareKey]) > 0) {
                      const val = parseFloat(share[shareKey]);
                      transferAmount = share.commissionType === 1 ? (transactionAmount * val) / 100 : val;
                      resolvedBy = `Fallback (${defaultScheme.name})`;
                      console.log(`[Commission]   MATCH Default Scheme! Share found for ${shareKey}. Type: ${share.commissionType === 1 ? 'Percent' : 'Flat'}, Value: ${val}, Final Amount: ${transferAmount}`);
                  } else {
                    console.log(`[Commission]   Scheme ${defaultScheme.name} has 0 or no share for ${shareKey} / SubService ${subServiceId}. Share Object: ${JSON.stringify(share)}`);
                  }
              } else {
                console.log(`[Commission]   CRITICAL: No schemes whatsoever found for tenant ${user.tenantId}`);
              }
          }

          if (transferAmount <= 0) {
            console.log(`[Commission]   SKIP: Final transfer amount is 0.`);
            continue;
          }

          // --- EXECUTE TRANSFER ---
          const isSenderTopAdmin = ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"].includes(sender.identity.toUpperCase());
          
          try {
            let senderWallet;
            if (isSenderTopAdmin && adminCorporateWallet) {
                senderWallet = adminCorporateWallet;
            } else {
                await ensureWallet(sender.id, user.tenantId, tx);
                senderWallet = await tx.wallet.findUnique({ where: { userId: sender.id } });
            }

            if (!senderWallet) {
                console.log(`[Commission]   ERROR: Could not find wallet for sender ${sender.fullName}`);
                continue;
            }

            console.log(`[Commission]   Executing: Wallet ${senderWallet.id} (-${transferAmount}) -> Partner ${receiver.fullName}`);

            // Deduct from Sender
            await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: transferAmount } }
            });

            // Create DEBIT Transaction log for Sender
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: senderWallet.id,
                    amount: transferAmount,
                    type: "DEBIT",
                    category: "COMMISSION_PAYOUT",
                    referenceId: transactionLog.id,
                    description: customDescription || (isTransfer 
                        ? `${serviceLabel} commission paid to ${receiver.fullName} (determined by ${resolvedBy})`
                        : `Commission paid to ${receiver.fullName} for joiner ${joinerName} (determined by ${resolvedBy})`),
                    tenantId: user.tenantId
                }
            });

            // CREDIT TO RECEIVER
            await ensureWallet(receiver.id, user.tenantId, tx);
            const recWallet = await tx.wallet.findUnique({ where: { userId: receiver.id } });
            await tx.wallet.update({
                where: { id: recWallet.id },
                data: { balance: { increment: transferAmount } }
            });

            // Create CREDIT Transaction log for Receiver
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: recWallet.id,
                    amount: transferAmount,
                    type: "CREDIT",
                    category: "COMMISSION",
                    referenceId: transactionLog.id,
                    description: customDescription || (isTransfer
                        ? `${serviceLabel} commission from ${sender.fullName} (determined by ${resolvedBy})`
                        : `Commission for ${joinerName} received from ${sender.fullName} (determined by ${resolvedBy})`),
                    tenantId: user.tenantId
                }
            });

            await tx.commissionHistory.create({
                data: {
                    id: generateUuid(),
                    userId: receiver.id,
                    transactionId: transactionLog.id,
                    amount: transferAmount,
                    accountType: "commission"
                }
            });


            console.log(`[Commission]   SUCCESS: ${transferAmount} moved.`);
          } catch (txErr) {
            console.error(`[Commission]   CRITICAL TX ERROR:`, txErr);
          }
      }

      console.log("[Commission] <<< FINISHED");
      return { success: true };

    } catch (err) {
      console.error("[Commission] CRITICAL GLOBAL ERROR:", err);
      return { success: false, error: err.message };
    }
  }
};

async function ensureWallet(userId, tenantId, tx) {
    if (!userId) return;
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        await tx.wallet.create({
            data: {
                id: generateUuid(),
                userId,
                tenantId,
                balance: 0,
                isCorporate: false
            }
        });
    }
}

module.exports = commissionService;
