const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const ProjectCredential = require("../models/ProjectCredential");
const { discordStyleProjectName } = require("../functions.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("projectcredential")
        .setDescription("Manage project access credentials")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Add or update project access credentials")
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
                .setDescription("Remove project access credentials")
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
                .setDescription("List all project credentials you've created")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("Get detailed information about a project credential")
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

            await interaction.editReply({
                content: `Updated access credentials for project "${formattedProjectName}".`,
                ephemeral: true,
            });
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

            await interaction.editReply({
                content: `Added access credentials for project "${formattedProjectName}".`,
                ephemeral: true,
            });
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
        // Find all credentials created by this user
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
            .setColor(process.env.EMBEDCOLOR)
            .setDescription(`You have created ${credentials.length} project credential(s).`)
            .setTimestamp();

        // Add fields for each credential (limit to 25 for readability)
        const displayCredentials = credentials.slice(0, 25);

        displayCredentials.forEach((credential, index) => {
            const expirationText = credential.expirationDate
                ? `Expires: ${credential.expirationDate.toLocaleDateString()}`
                : "No expiration";

            const isExpired = credential.isExpired();
            const status = isExpired ? "🔴 Expired" : "🟢 Active";

            embed.addFields({
                name: `${index + 1}. ${credential.projectName}`,
                value: `**Status:** ${status}\n**Code:** ${credential.verificationCode}\n**${expirationText}**\n**Usage Count:** ${credential.usageCount}`,
            });
        });

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
            createdBy: interaction.user.id, // Only show own credentials
        });

        if (!credential) {
            return await interaction.editReply({
                content: `No credentials found for project "${formattedProjectName}" or you don't have permission to view them.`,
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`Project Credential: ${credential.projectName}`)
            .setColor(process.env.EMBEDCOLOR)
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

        // Add recent usage log (up to 10 entries)
        if (credential.usageLog.length > 0) {
            const recentUsage = credential.usageLog
                .slice(-10)
                .reverse()
                .map((log, index) => {
                    const date = new Date(log.timestamp).toLocaleString();
                    const status = log.success ? "✅ Success" : "❌ Failed";
                    const reason = log.failureReason ? ` (${log.failureReason})` : "";
                    return `${index + 1}. <@${log.userId}> - ${date} - ${status}${reason}`;
                })
                .join("\n");

            embed.addFields({
                name: "Recent Usage",
                value: recentUsage || "No usage recorded",
            });
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