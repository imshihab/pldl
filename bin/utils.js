const setting = require("./settings.json");

const http = require('http');
const https = require('https');

/**
 * @param {string | https.RequestOptions | import("url").URL} url
 */
function ContentLength(url, maxRetries = 5, currentAttempt = 1) {
    return new Promise((resolve, reject) => {
        const protocol = `${url}`.startsWith('https') ? https : http;

        protocol.get(url, (res) => {
            const { statusCode } = res;

            if (statusCode === 200) {
                const contentLength = res.headers['content-length'];
                if (contentLength) {
                    resolve(parseInt(contentLength));
                } else {
                    if (currentAttempt < maxRetries) {
                        console.log(`Attempt ${currentAttempt}: Content length not available. Retrying...`);
                        setTimeout(() => {
                            ContentLength(url, maxRetries, currentAttempt + 1)
                                .then(resolve)
                                .catch(reject);
                        }, 3000);
                    } else {
                        reject(new Error(`Content length not available after ${maxRetries} attempts.`));
                    }
                }
            } else if (statusCode === 302) {
                // Handle the redirection by extracting the new URL from the 'Location' header
                const newUrl = res.headers['location'];
                if (newUrl) {
                    setTimeout(() => {
                        ContentLength(newUrl, maxRetries, currentAttempt + 1)
                            .then(resolve)
                            .catch(reject);
                    }, 3000);
                } else {
                    reject(new Error(`Redirection failed. New URL not provided in the 'Location' header.`));
                }
            } else {
                if (currentAttempt < maxRetries) {
                    console.log(`Attempt ${currentAttempt}: Request failed with Status Code: ${statusCode}. Retrying...`);
                    setTimeout(() => {
                        ContentLength(url, maxRetries, currentAttempt + 1)
                            .then(resolve)
                            .catch(reject);
                    }, 3000);
                } else {
                    reject(new Error(`Request failed with Status Code: ${statusCode} after ${maxRetries} attempts.`));
                }
            }
        }).on('error', (err) => {
            reject(err);
        });
    });
}



function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedHours = String(hours).padStart(2, "0");
    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = String(remainingSeconds).padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

/**
 * @param {any} seconds
 */
async function wait(seconds) {
    const totalSeconds = seconds;
    const interval = 1000; // 1 second
    for (let seconds = totalSeconds; seconds > 0; seconds--) {
        process.stdout.write(`Waiting... ${seconds}s remaining\r`);
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}

/**
 * @param {any} text
 * @param {any} hexColor
 */
const ColorLog = (text, hexColor) => {
    const colorCode = `\x1b[38;2;${hexToRgb(hexColor).r};${hexToRgb(hexColor).g
        };${hexToRgb(hexColor).b}m`;
    const resetCode = "\x1b[0m";
    return `${colorCode}${text}${resetCode}`;
};

/**
 * @param {string} hex
 */
function hexToRgb(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
}

/**
 * Generates a progress bar string based on the progress value.
 * @param {number} progress - The progress value in percentage (0-100).
 * @returns {string} The progress bar string.
 */
function generateProgressBar(progress) {
    let completedChar, remainingChar;
    const CompleteColor = "#C50F1F";
    const RemaniingColor = "#F9F1A5";

    switch (setting.progStyle) {
        case 1:
            completedChar = "━";
            remainingChar = "╺";
            break;
        case 2:
            completedChar = "▓";
            remainingChar = "░";
            break;
        case 3:
            completedChar = "■";
            remainingChar = "░";
            break;
        case 4:
            completedChar = "=";
            remainingChar = ".";
            break;
        case 5:
            completedChar = "█";
            remainingChar = "░";
            break;
        case 6:
            completedChar = "▒";
            remainingChar = "░";
            break;
        case 7:
            completedChar = "⬛";
            remainingChar = "⬜";
            break;
        case 8:
            completedChar = "◼";
            remainingChar = "◻";
            break;
        default:
            completedChar = "-";
            remainingChar = ".";
            break;
    }

    const progressBarWidth = 40;
    const completed = Math.round((progress / 100) * progressBarWidth);
    const remaining = progressBarWidth - completed;
    const progressBar =
        ColorLog(completedChar.repeat(completed), CompleteColor) +
        ColorLog(remainingChar.repeat(remaining), RemaniingColor);
    return `[ ${progressBar} ]`;
}

/**
 * Formats the given number of bytes into a human-readable string.
 * @param {number} bytes - The number of bytes.
 * @returns {string} The formatted string representing the bytes.
 */
function formatBytes(bytes) {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (isNaN(bytes) || !isFinite(bytes) || bytes === 0) {
        return "0 B";
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
    return filename.replace(/[<>:"/\\|?*]/g, ""); // Remove invalid characters for filenames
}

function help() {
    // ANSI escape code for purple color
    const purpleColor = "\x1b[35m";
    // ANSI escape code to reset color
    const resetColor = "\x1b[0m";

    console.log(`Usage: pldl {playlistID}`);
    console.log(
        `Replace {playlistID} with the ID of the YouTube playlist you want to download.`
    );

    console.log(`\nOptions:\n`);
    console.log(`  -h, --h, --help      Display usage information`);
    console.log(`  -v, --v, --version   Display version number`);

    console.log(`\nSettings:\n`);
    console.log(
        `  API Key: Set your YouTube API key using ${purpleColor}pldl setting.key='YOUR_API_KEY'${resetColor}`
    );
    console.log(
        `  Playlist Folder: Set the ${purpleColor}pldl setting.plFolder${resetColor} to 'true' or 'false' to enable or disable playlist folders`
    );
    console.log(
        `  Max Result: ${purpleColor}pldl setting.maxResults=240${resetColor}  This setting allows you to control the number of videos to download from the playlist`
    );
    process.exit(0);
}

module.exports = {
    generateProgressBar,
    formatBytes,
    sanitizeFilename,
    help,
    formatTime,
    wait,
    ContentLength
};
