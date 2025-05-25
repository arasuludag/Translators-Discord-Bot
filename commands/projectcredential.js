const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
} = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const ProjectCredential = require("../models/ProjectCredential");
const { discordStyleProjectName } = require("../functions.js");
const Request = require("../models/ProjectRequest");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("projectcredential")
        .setDescription("[PM] Manage project access credentials")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("[PM] Add or update project access credentials")
                .addStringOption((option) =>
                    option
                        .setName("project_name")
                        .setDescription("Name of the project (exact match required)")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("verification_code")
                        .setDescription("Verification code/password for the project")
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("expiration_date")
                        .setDescription("Optional: Expiration date (YYYY-MM-DD)")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("[PM] Remove project access credentials")
                .addStringOption((option) =>
                    option
                        .setName("project_name")
                        .setDescription("Name of the project to remove credentials for")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("[PM] List all project credentials you've created")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("[PM] Get detailed information about a project credential")
                .addStringOption((option) =>
                    option
                        .setName("project_name")
                        .setDescription("Name of the project to get info for")
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Check if user is a project manager (Plint role)
        const isPlint = await interaction.member.roles.cache.some(
            (role) => role.name === process.env.PROJECTMANAGERROLENAME
        );

        if (!isPlint) {
            return await replyEmbed(interaction, {
                path: "notAuthorized",
                values: {
                    role: process.env.PROJECTMANAGERROLENAME,
                },
                ephemeral: true,
            });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "add":
                await handleAddCredential(interaction);
                break;
            case "remove":
                await handleRemoveCredential(interaction);
                break;
            case "list":
                await handleListCredentials(interaction);
                break;
            case "info":
                await handleCredentialInfo(interaction);
                break;
        }
    },
};

async function handleAddCredential(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const projectName = interaction.options.getString("project_name");
        const verificationCode = interaction.options.getString("verification_code");
        const expirationDateStr = interaction.options.getString("expiration_date");

        // Format project name
        let formattedProjectName;
        try {
            formattedProjectName = discordStyleProjectName(projectName);
        } catch (error) {
            return await interaction.editReply({
                content: "Please provide a valid project name.",
                ephemeral: true,
            });
        }

        // Parse expiration date if provided
        let expirationDate = null;
        if (expirationDateStr) {
            const date = new Date(expirationDateStr);
            if (isNaN(date.getTime())) {
                return await interaction.editReply({
                    content: "Invalid expiration date format. Please use YYYY-MM-DD.",
                    ephemeral: true,
                });
            }
            expirationDate = date;
        }

        // Check if credential already exists
        const existingCredential = await ProjectCredential.findOne({
            projectName: formattedProjectName,
        });

        if (existingCredential) {
            // Update existing credential
            existingCredential.verificationCode = verificationCode;
            existingCredential.expirationDate = expirationDate;
            existingCredential.updatedAt = new Date();
            await existingCredential.save();
        } else {
            // Create new credential
            const newCredential = new ProjectCredential({
                projectName: formattedProjectName,
                verificationCode: verificationCode,
                expirationDate: expirationDate,
                createdBy: interaction.user.id,
                createdByUsername: interaction.user.tag,
            });

            await newCredential.save();
        }

        // Log the action
        const logsChannel = interaction.guild.channels.cache.get(
            process.env.LOGSCHANNELID
        );
        if (logsChannel) {
            sendEmbed(logsChannel, {
                path: "credentials.credentialAdded",
                values: {
                    user: interaction.user.id,
                    projectName: formattedProjectName,
                    action: existingCredential ? "updated" : "added",
                },
            });
        }

        // Create request in database
        try {
            await Request.create({
                userId: interaction.user.id,
                username: interaction.user.tag,
                projectName: formattedProjectName,
                verificationCode: verificationCode || "",
                requestType: "manual",
                interactionId: interaction.id,
                status: "pending",
            });
        } catch (error) {
            console.error("Error saving request to MongoDB:", error);
            logsChannel.send(`Error saving request to MongoDB: ${error.message}`);
        }

        // Send confirmation button
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`translators-requestaccess-confirm-${interaction.user.id}-${interaction.id}`)
                .setLabel("Confirm")
                .setStyle("Success")
        );

        await interaction.editReply({
            content: `Credentials ${existingCredential ? "updated" : "added"} for project "${formattedProjectName}".\nVerification Code: ${verificationCode}${expirationDate ? `\nExpiration Date: ${expirationDate.toLocaleDateString()}` : ""}\n\nPlease confirm your access request.`,
            components: [button],
            ephemeral: true,
        });

    } catch (error) {
        console.error("Error adding project credential:", error);
        await interaction.editReply({
            content: "An error occurred while adding project credentials.",
            ephemeral: true,
        });
    }
}

async function handleRemoveCredential(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const projectName = interaction.options.getString("project_name");

        // Format project name
        let formattedProjectName;
        try {
            formattedProjectName = discordStyleProjectName(projectName);
        } catch (error) {
            return await interaction.editReply({
                content: "Please provide a valid project name.",
                ephemeral: true,
            });
        }

        // Find and remove credential
        const result = await ProjectCredential.deleteOne({
            projectName: formattedProjectName,
            createdBy: interaction.user.id, // Only allow removal of own credentials
        });

        if (result.deletedCount === 0) {
            return await interaction.editReply({
                content: `No credentials found for project "${formattedProjectName}" or you don't have permission to remove them.`,
                ephemeral: true,
            });
        }

        await interaction.editReply({
            content: `Removed access credentials for project "${formattedProjectName}".`,
            ephemeral: true,
        });

        // Log the action
        const logsChannel = interaction.guild.channels.cache.get(
            process.env.LOGSCHANNELID
        );
        if (logsChannel) {
            sendEmbed(logsChannel, {
                path: "credentials.credentialRemoved",
                values: {
                    user: interaction.user.id,
                    projectName: formattedProjectName,
                },
            });
        }
    } catch (error) {
        console.error("Error removing project credential:", error);
        await interaction.editReply({
            content: "An error occurred while removing project credentials.",
            ephemeral: true,
        });
    }
}

async function handleListCredentials(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const credentials = await ProjectCredential.find({
            createdBy: interaction.user.id,
        }).sort({ createdAt: -1 });

        if (credentials.length === 0) {
            return await interaction.editReply({
                content: "You haven't created any project credentials yet.",
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle("Your Project Credentials")
            .setColor(parseInt(process.env.EMBEDCOLOR))
            .setDescription(`You have created ${credentials.length} project credential(s).`)
            .setTimestamp();

        const displayCredentials = credentials.slice(0, 25);

        for (const credential of displayCredentials) {
            const channel = interaction.guild.channels.cache.find(
                ch => ch.name === credential.projectName
            );

            const status = credential.isExpired() ? "🔴 Expired" : "🟢 Active";
            const expiration = credential.expirationDate
                ? `Expires: ${credential.expirationDate.toLocaleDateString()}`
                : "No expiration";

            let displayText = `Status: ${status}\nCode: ${credential.verificationCode}\n`;

            if (channel?.parent) {
                displayText += `Category: ${channel.parent.name}\n`;
            }

            displayText += `${expiration}\nUsage Count: ${credential.usageCount}`;

            if (channel) {
                displayText += `\n**Channel: **<#${channel.id}>`;
            } else {
                displayText += "\n**No channel found**";
            }

            embed.addFields({
                name: credential.projectName,
                value: displayText
            });
        }

        if (credentials.length > 25) {
            embed.setFooter({
                text: `Showing 25 of ${credentials.length} credentials.`,
            });
        }

        await interaction.editReply({
            embeds: [embed],
            ephemeral: true,
        });
    } catch (error) {
        console.error("Error listing project credentials:", error);
        await interaction.editReply({
            content: "An error occurred while listing project credentials.",
            ephemeral: true,
        });
    }
}

async function handleCredentialInfo(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const projectName = interaction.options.getString("project_name");

        // Format project name
        let formattedProjectName;
        try {
            formattedProjectName = discordStyleProjectName(projectName);
        } catch (error) {
            return await interaction.editReply({
                content: "Please provide a valid project name.",
                ephemeral: true,
            });
        }

        // Find credential
        const credential = await ProjectCredential.findOne({
            projectName: formattedProjectName,
        });

        if (!credential) {
            return await interaction.editReply({
                content: `No credentials found for project "${formattedProjectName}"`,
                ephemeral: true,
            });
        }

        // Find channel information
        const channel = interaction.guild.channels.cache.find(
            ch => ch.name === credential.projectName
        );

        let channelField = { name: "Channel", value: "No channel found", inline: true };
        let categoryField = { name: "Category", value: "None", inline: true };

        if (channel) {
            channelField.value = `<#${channel.id}>`;
            if (channel.parent) {
                categoryField.value = channel.parent.name;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`Project Credential: ${credential.projectName}`)
            .setColor(parseInt(process.env.EMBEDCOLOR))
            .setDescription("Detailed information about this project credential.")
            .addFields(
                {
                    name: "Project Name",
                    value: credential.projectName,
                    inline: true,
                },
                {
                    name: "Verification Code",
                    value: credential.verificationCode,
                    inline: true,
                },
                {
                    name: "Status",
                    value: credential.isExpired() ? "🔴 Expired" : "🟢 Active",
                    inline: true,
                },
                channelField,
                categoryField,
                {
                    name: "Expiration Date",
                    value: credential.expirationDate
                        ? credential.expirationDate.toLocaleDateString()
                        : "No expiration",
                    inline: true,
                },
                {
                    name: "Created By",
                    value: credential.createdByUsername,
                    inline: true,
                },
                {
                    name: "Created At",
                    value: credential.createdAt.toLocaleString(),
                    inline: true,
                },
                {
                    name: "Last Updated",
                    value: credential.updatedAt.toLocaleString(),
                    inline: true,
                },
                {
                    name: "Usage Count",
                    value: credential.usageCount.toString(),
                    inline: true,
                }
            )
            .setTimestamp();

        // Add recent usage log (up to 25 entries)
        if (credential.usageLog.length > 0) {
            const recentUsage = credential.usageLog
                .slice(-25)
                .reverse()
                .map((log, index) => {
                    const date = new Date(log.timestamp).toLocaleString();
                    const status = log.success ? "✅ Success" : "❌ Failed";
                    const reason = log.failureReason ? ` (${log.failureReason})` : "";
                    return `${index + 1}. <@${log.userId}> - ${date} - ${status}${reason}`;
                })
                .join("\n");

            if (recentUsage) {
                embed.addFields({
                    name: "Recent Usage",
                    value: recentUsage || "No usage recorded",
                });
            }
        }

        await interaction.editReply({
            embeds: [embed],
            ephemeral: true,
        });
    } catch (error) {
        console.error("Error getting credential info:", error);
        await interaction.editReply({
            content: "An error occurred while getting credential information.",
            ephemeral: true,
        });
    }
} 