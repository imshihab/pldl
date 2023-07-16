/**
 * Generates a progress bar string based on the progress value.
 * @param {number} progress - The progress value in percentage (0-100).
 * @returns {string} The progress bar string.
 */
function generateProgressBar(progress) {
    const progressBarWidth = 40;
    const completed = Math.round((progress / 100) * progressBarWidth);
    const remaining = progressBarWidth - completed;
    const darkGreen = '\x1b[32m'; // Dark green color
    const lightGreen = '\x1b[92m'; // Light green color (may not work in all terminals)
    const resetColor = '\x1b[0m'; // Reset color

    const progressBar = darkGreen + '█'.repeat(completed) + lightGreen + '░'.repeat(remaining) + resetColor;
    return `[${progressBar}]`;
}

/**
 * Formats the given number of bytes into a human-readable string.
 * @param {number} bytes - The number of bytes.
 * @returns {string} The formatted string representing the bytes.
 */
function formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (isNaN(bytes) || !isFinite(bytes) || bytes === 0) {
        return '0 B';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formattedSize = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${formattedSize} ${sizes[i]}`;
}

/**
 * Sanitizes the given filename by removing invalid characters.
 * @param {string} filename - The original filename.
 * @returns {string} The sanitized filename.
 */
function sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid characters for filenames
}

function help() {
    // ANSI escape code for purple color
    const purpleColor = '\x1b[35m';
    // ANSI escape code to reset color
    const resetColor = '\x1b[0m';

    console.log(`Usage: pldl {playlistID}`);
    console.log(`Replace {playlistID} with the ID of the YouTube playlist you want to download.`);

    console.log(`\nOptions:\n`);
    console.log(`  -h, --h, --help      Display usage information`);
    console.log(`  -v, --v, --version   Display version number`);

    console.log(`\nSettings:\n`);
    console.log(`  API Key: Set your YouTube API key using ${purpleColor}pldl setting.key='YOUR_API_KEY'${resetColor}`);
    console.log(`  Playlist Folder: Set the ${purpleColor}pldl setting.plFolder${resetColor} to 'true' or 'false' to enable or disable playlist folders`);
    console.log(`  Max Result: ${purpleColor}pldl setting.maxResults=240${resetColor}  This setting allows you to control the number of videos to download from the playlist`);
    process.exit(0);
}

module.exports = {
    generateProgressBar,
    formatBytes,
    sanitizeFilename,
    help
};
