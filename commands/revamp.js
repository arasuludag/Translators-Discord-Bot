const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ButtonBuilder,
    ActionRowBuilder,
} = require("discord.js");
const {
    findChannelByID,
    findCategoryByName,
} = require("../functions.js");
const { replyEmbed, sendEmbed, updateEmbed, getEmbed } = require("../customSend.js");
const ProjectCredential = require("../models/ProjectCredential");
const { discordStyleProjectName } = require("../functions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("revamp")
        .setDescription("[ADMIN/PM] Remove all members from a project channel and notify them.")
        .addStringOption((option) =>
            option
                .setName("reason")
                .setDescription("Optional reason for the revamp")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("rename")
                .setDescription("[PM] Optional new name for the project channel")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("verification_code")
                .setDescription("[PM] Optional new verification code for the project")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("expiration_date")
                .setDescription("[PM] Optional: Expiration date (YYYY-MM-DD)")
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction) {
        // Get the logs channel for logging actions
        const logsChannel = findChannelByID(interaction, process.env.LOGSCHANNELID);

        // Check if the command is used in a thread
        if (interaction.channel.isThread()) {
            await replyEmbed(interaction, {
                path: "setParentError",
                ephemeral: true
            });
            return;
        }

        // Check if the channel is under a Projects category or Archived category
        const isValidChannel = interaction.channel.parent &&
            (interaction.channel.parent.name.includes(process.env.PROJECTSCATEGORY) ||
                interaction.channel.parent.name.includes(process.env.ARCHIVECATEGORY));

        if (!isValidChannel) {
            await replyEmbed(interaction, {
                path: "revamp.invalidChannel",
                ephemeral: true
            });
            return;
        }

        // Check if the channel is archived
        const isArchived = interaction.channel.parent &&
            interaction.channel.parent.name.includes(process.env.ARCHIVECATEGORY);

        // Create confirmation button
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`revamp_confirm_${interaction.id}`)
                .setLabel("Confirm Revamp")
                .setStyle("Danger"),
            new ButtonBuilder()
                .setCustomId(`revamp_cancel_${interaction.id}`)
                .setLabel("Cancel")
                .setStyle("Secondary")
        );

        // Get the reason if provided
        const reason = interaction.options.getString("reason") || "Project season transition";

        // Reply with confirmation message
        let confirmMessage = "revamp.confirmRevamp";
        if (isArchived) {
            confirmMessage = "revamp.confirmRevampArchived";
        }

        await replyEmbed(interaction, {
            path: confirmMessage,
            values: {
                channel: interaction.channel.id
            },
            components: [button],
            ephemeral: true
        });

        // Set up collector for button interaction
        const filter = (i) =>
            (i.customId === `revamp_confirm_${interaction.id}` ||
                i.customId === `revamp_cancel_${interaction.id}`) &&
            i.user.id === interaction.user.id;

        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 60000 // 1 minute timeout
        });

        collector.on("collect", async (i) => {
            if (i.customId === `revamp_cancel_${interaction.id}`) {
                await updateEmbed(i, {
                    path: "revamp.revampCancelled",
                    components: [],
                    ephemeral: true
                });
                return;
            }

            // Proceed with revamp
            await updateEmbed(i, {
                path: "revamp.processing",
                components: [],
                ephemeral: true
            });

            // If the channel is archived, unarchive it first
            if (isArchived) {
                // Unarchive the channel first
                const category = findCategoryByName(
                    interaction,
                    process.env.PROJECTSCATEGORY
                );

                await interaction.channel
                    .setParent(category.id, { lockPermissions: false })
                    .catch((error) => {
                        logsChannel.send("Error: Setting the category of channel. \n " + error);
                    });

                await sendEmbed(logsChannel, {
                    path: "movedFromArchive",
                    values: {
                        user: interaction.user.id,
                        channel: interaction.channel.id,
                    },
                });
            }

            // Get all members with access to the channel
            const channelMembers = [];
            const adminRoleName = process.env.ADMINROLENAME;
            const pmRoleName = process.env.PROJECTMANAGERROLENAME;
            const botId = interaction.client.user.id;

            // Store all members that will be removed
            const removedMembers = [];

            // Process all permission overwrites
            await Promise.all(
                Array.from(interaction.channel.permissionOverwrites.cache.values())
                    .filter(overwrite => overwrite.type === 1) // Only user overwrites, not role overwrites
                    .map(async (overwrite) => {
                        try {
                            const member = await interaction.guild.members.fetch(overwrite.id);

                            // Skip admins, PMs, and the bot
                            if (
                                member.roles.cache.some(role => role.name.toLowerCase() === adminRoleName.toLowerCase()) ||
                                member.roles.cache.some(role => role.name.toLowerCase() === pmRoleName.toLowerCase()) ||
                                member.id === botId
                            ) {
                                return;
                            }

                            // Add to the list of members to be removed
                            channelMembers.push(member);
                            removedMembers.push(member.id);

                            // Remove the member from the channel
                            await interaction.channel.permissionOverwrites.delete(member.id);

                            // Send DM to the removed member
                            await sendEmbed(member.user, {
                                path: "revamp.revampDM",
                                values: {
                                    channel: interaction.channel.id
                                }
                            });
                        } catch (error) {
                            console.error(`Error processing member ${overwrite.id}:`, error);
                        }
                    })
            );

            // Check if user is a project manager for optional fields
            const isPM = interaction.member.roles.cache.some(
                (role) => role.name === process.env.PROJECTMANAGERROLENAME
            );

            // If rename option is provided, check PM role
            const newName = interaction.options.getString("rename");
            if (newName) {
                if (!isPM) {
                    await replyEmbed(interaction, {
                        path: "notAuthorized",
                        values: {
                            role: process.env.PROJECTMANAGERROLENAME,
                        },
                        ephemeral: true,
                    });
                    return;
                }

                try {
                    const formattedName = discordStyleProjectName(newName);
                    await interaction.channel.setName(formattedName);
                    
                    // Log the rename
                    await sendEmbed(logsChannel, {
                        path: "channelRenamed",
                        values: {
                            user: interaction.user.id,
                            oldName: interaction.channel.name,
                            newName: formattedName
                        }
                    });
                } catch (error) {
                    console.error("Error renaming channel:", error);
                    await sendEmbed(logsChannel, {
                        path: "error",
                        values: {
                            error: "Failed to rename channel: " + error.message
                        }
                    });
                }
            }

            // If verification code is provided, check PM role
            const verificationCode = interaction.options.getString("verification_code");
            const expirationDateStr = interaction.options.getString("expiration_date");
            
            if (verificationCode || expirationDateStr) {
                if (!isPM) {
                    await replyEmbed(interaction, {
                        path: "notAuthorized",
                        values: {
                            role: process.env.PROJECTMANAGERROLENAME,
                        },
                        ephemeral: true,
                    });
                    return;
                }

                try {
                    const projectName = interaction.channel.name;
                    const existingCredential = await ProjectCredential.findOne({
                        projectName: projectName
                    });

                    // Parse expiration date if provided
                    let expirationDate = null;
                    if (expirationDateStr) {
                        const date = new Date(expirationDateStr);
                        if (isNaN(date.getTime())) {
                            throw new Error("Invalid expiration date format. Please use YYYY-MM-DD.");
                        }
                        expirationDate = date;
                    }

                    if (existingCredential) {
                        // Update existing credential
                        if (verificationCode) {
                            existingCredential.verificationCode = verificationCode;
                        }
                        if (expirationDateStr) {
                            existingCredential.expirationDate = expirationDate;
                        }
                        existingCredential.updatedAt = new Date();
                        await existingCredential.save();
                    } else if (verificationCode) {
                        // Create new credential only if verification code is provided
                        const newCredential = new ProjectCredential({
                            projectName: projectName,
                            verificationCode: verificationCode,
                            expirationDate: expirationDate,
                            createdBy: interaction.user.id,
                            createdByUsername: interaction.user.tag
                        });
                        await newCredential.save();
                    }

                    // Log the credential update
                    if (verificationCode || expirationDateStr) {
                        await sendEmbed(logsChannel, {
                            path: "credentials.credentialAdded",
                            values: {
                                user: interaction.user.id,
                                projectName: projectName,
                                action: existingCredential ? "updated" : "added",
                                expirationDate: expirationDate ? expirationDate.toLocaleDateString() : "No expiration"
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error updating project credential:", error);
                    await sendEmbed(logsChannel, {
                        path: "error",
                        values: {
                            error: "Failed to update project credential: " + error.message
                        }
                    });
                }
            }

            // Log the action
            await sendEmbed(logsChannel, {
                path: "revamp.revampLog",
                values: {
                    user: interaction.user.id,
                    channel: interaction.channel.id,
                    reason: reason,
                    removedCount: removedMembers.length
                }
            });

            // Notify the channel
            await sendEmbed(interaction.channel, {
                path: "revamp.channelRevamped",
                values: {
                    user: interaction.user.id,
                    reason: reason
                }
            });

            // Final confirmation to the user
            const embedData = getEmbed({
                path: "revamp.revampComplete",
                values: {
                    removedCount: removedMembers.length,
                    channel: interaction.channel.id
                }
            });

            await i.followUp({
                ...embedData,
                ephemeral: true
            });
        });

        // Handle if the collector expires
        collector.on("end", (collected, reason) => {
            if (reason === "time" && collected.size === 0) {
                const embedData = getEmbed({
                    path: "revamp.revampTimeout"
                });

                interaction.followUp({
                    ...embedData,
                    ephemeral: true
                });
            }
        });
    },
}; 