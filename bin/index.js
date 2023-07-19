#!/usr/bin/env node

"use strict";
process.stdout.write(`\u001b]0;YT Playlist downloader\u0007`);

const ytdl = require("ytdl-core");
const { google } = require("googleapis");
const fs = require("node:fs");
const pkg = require("./../package.json");
const setting = require("./settings.json");
const {
    generateProgressBar,
    formatBytes,
    sanitizeFilename,
    help,
    wait,
    formatTime,
} = require("./utils");
const path = require("node:path");

const Args = process.argv.slice(2);
if (Args.length === 0) help();
const root = process.cwd();
const BASE_URL = "https://www.youtube.com/watch?v=";

const versionFlags = new Set(["-v", "--v", "--version"]);
const helpFlags = new Set(["-h", "--h", "--help"]);

const arg = Args[0];
const isDash = arg.startsWith("-");
const isApiFlag = arg.startsWith("setting.key=");
const isPlFolderFlag = arg.startsWith("setting.plFolder=");
const isprogStyleFlag = arg.startsWith("setting.progStylele=");
const playlistId = arg;

const purpleColor = "\x1b[35m";
const resetColor = "\x1b[0m";

if (versionFlags.has(arg)) {
    console.log(
        `pldl/${purpleColor}${pkg.version}${resetColor} Node: ${process.version}`
    );
    process.exit(0);
} else if (helpFlags.has(arg)) {
    help();
} else if (isApiFlag) {
    const apiKey = arg.split("=")[1];
    setting.key = apiKey;
    fs.writeFile(
        `${__dirname}/settings.json`,
        JSON.stringify(setting, null, "    "),
        (err) => {
            if (err) {
                console.error("Error writing settings file:", err);
                process.exit(1);
            }
            console.log("API key saved successfully!");
            process.exit(0);
        }
    );
} else if (isprogStyleFlag) {
    const progStyleValue = parseInt(arg.split("=")[1], 10);
    if (progStyleValue >= 1 && progStyleValue <= 8) {
        setting.progStyle = progStyleValue;
        fs.writeFile(
            `${__dirname}/settings.json`,
            JSON.stringify(setting, null, "    "),
            (err) => {
                if (err) {
                    console.error("Error writing settings file:", err);
                    process.exit(1);
                }
                console.log("Progress bar style saved successfully!");
                process.exit(0);
            }
        );
    } else {
        console.error("Invalid progress bar style. Allowed values are 1-8.");
        process.exit(1);
    }
} else if (isPlFolderFlag) {
    const value = arg.split("=")[1].trim();
    setting.plFolder = value === "true";
    fs.writeFile(
        `${__dirname}/settings.json`,
        JSON.stringify(setting, null, "    "),
        (err) => {
            if (err) {
                console.error("Error writing settings file:", err);
                process.exit(1);
            }
            console.log(
                `Setting "plFolder" saved successfully! New value: ${setting.plFolder}`
            );
            process.exit(0);
        }
    );
} else if (!isDash && !isPlFolderFlag && !isApiFlag && !isprogStyleFlag) {
    const youtube = google.youtube({
        version: "v3",
        auth: setting.key,
    });

    if (!fs.existsSync(path.join(__dirname, "Playlist"))) {
        fs.mkdirSync(path.join(__dirname, "Playlist"));
    }
    /**
     * Retrieve the title of a YouTube playlist.
     * @param {string} playlistId - The ID of the YouTube playlist.
     * @returns {Promise<string>} - A promise that resolves with the playlist title.
     */
    function getPlaylistTitle(playlistId) {
        return new Promise(async (resolve, reject) => {
            // @ts-ignore
            await youtube.playlists.list(
                {
                    part: "snippet",
                    id: playlistId,
                },
                (error, response) => {
                    if (error) {
                        console.error("Error:", error.message);
                        reject(error);
                    } else {
                        const playlist = response.data.items[0];
                        if (playlist) {
                            resolve(playlist.snippet.title);
                        } else {
                            reject(new Error("Playlist not found"));
                        }
                    }
                }
            );
        });
    }
    (async () => {
        /**
         * @typedef {Object} PlaylistVideo
         * @property {string} videoId - The ID of the video.
         * @property {string} title - The title of the video.
         * @property {string} description - The description of the video.
         * @property {string} thumbnail - The URL of the video's thumbnail image.
         * @property {string} link - The link to the video.
         */
        /**
         * @typedef {Object} PlaylistData
         * @property {string} Title - The title of the playlist.
         * @property {PlaylistVideo[]} Playlist - An array of playlist videos.
         */

        /** @type {PlaylistData} */
        let playlistData = { Title: null, Playlist: [] };
        try {
            playlistData.Title = await getPlaylistTitle(playlistId);
        } catch (error) {
            console.error("Error:", error.message);
            process.exit(1);
        }

        const filePath = path.join(__dirname, "Playlist", `${playlistId}.json`);
        try {
            if (fs.existsSync(filePath)) {
                playlistData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                throw new Error();
            }

            let nextPageToken = null;
            do {
                const response = await youtube.playlistItems.list({
                    // @ts-ignore
                    part: "snippet",
                    playlistId: playlistId,
                    maxResults: 24,
                    pageToken: nextPageToken,
                });
                const items = response.data.items;
                for (const item of items) {
                    const videoId = item.snippet.resourceId.videoId;
                    const videoTitle = item.snippet.title;
                    const videoDescription = item.snippet.description;
                    const videoThumbnail = item.snippet.thumbnails.default.url;
                    const videoLink = `${BASE_URL}${videoId}`;
                    playlistData.Playlist.push({
                        videoId: videoId,
                        title: sanitizeFilename(videoTitle),
                        description: videoDescription,
                        thumbnail: videoThumbnail,
                        link: videoLink,
                    });
                }
                nextPageToken = response.data.nextPageToken;
            } while (nextPageToken);

            fs.writeFileSync(
                filePath,
                JSON.stringify(playlistData, null, "    ")
            );
        } catch (error) {
        } finally {
            let indexOfVideo = 0;
            const { Title, Playlist } = playlistData;
            const videoFolder = setting.plFolder ? sanitizeFilename(Title) : "";
            const playlistFilePath = setting.plFolder
                ? path.join(
                    root,
                    videoFolder,
                    `${sanitizeFilename(Title)}.json`
                )
                : path.join(root, `${sanitizeFilename(Title)}.json`);
            const videoFolderExists = fs.existsSync(
                path.join(root, videoFolder)
            );

            if (setting.plFolder && !videoFolderExists) {
                fs.mkdirSync(path.join(root, videoFolder));
            }

            if (!fs.existsSync(playlistFilePath)) {
                fs.writeFileSync(
                    playlistFilePath,
                    JSON.stringify(playlistData, null, "    ")
                );
            }

            /**
             * @param {number} index
             */
            async function downloadVideo(index) {
                const playlistVideo = Playlist[index];
                const link = playlistVideo.link;
                try {
                    const info = await ytdl.getInfo(link);
                    const formats = ytdl.filterFormats(
                        info.formats,
                        "videoandaudio"
                    );
                    const filterVideos = formats.filter(
                        (format) => format.hasVideo && format.hasAudio
                    );
                    filterVideos.sort(
                        (a, b) =>
                            parseInt(b.qualityLabel.replace("p", "")) -
                            parseInt(a.qualityLabel.replace("p", ""))
                    );
                    const highestQualityFormat = filterVideos[0];
                    const videoReadableStream = ytdl(link, {
                        format: highestQualityFormat,
                    });
                    const videoTitle = playlistVideo.title;
                    const videoPath = setting.plFolder
                        ? path.join(root, videoFolder, `${videoTitle}.mp4`)
                        : path.join(root, `${videoTitle}.mp4`);
                    const videoFile = fs.createWriteStream(videoPath);
                    console.log(
                        `   Downloading \x1b[32m${videoTitle} ...\x1b[0m`
                    );
                    let downloadedBytes = 0;
                    const totalBytes = parseInt(
                        highestQualityFormat.contentLength
                    );
                    let prevDownloadedBytes = 0;
                    let prevTimestamp = Date.now();
                    let remainingTimeString = "";
                    let downloadSpeed = 0;

                    const updateRemainingTime = () => {
                        const currentTimestamp = Date.now();
                        const timeDiff =
                            (currentTimestamp - prevTimestamp) / 1000;
                        downloadSpeed =
                            (downloadedBytes - prevDownloadedBytes) / timeDiff;
                        prevDownloadedBytes = downloadedBytes;
                        prevTimestamp = currentTimestamp;
                        const remainingBytes = totalBytes - downloadedBytes;
                        const remainingTime = remainingBytes / downloadSpeed;
                        remainingTimeString = formatTime(remainingTime);
                    };

                    const updateInterval = setInterval(() => {
                        updateRemainingTime();
                    }, 1000);

                    videoReadableStream.on("data", (chunk) => {
                        downloadedBytes += chunk.length;
                        const progress = (downloadedBytes / totalBytes) * 100;
                        const progressBar = generateProgressBar(progress) || 0;
                        const completedSize = formatBytes(downloadedBytes) || 0;
                        const totalSize = formatBytes(totalBytes) || 0;
                        const speed = formatBytes(downloadSpeed);
                        const progressString = `     ${progressBar} \x1b[32m${completedSize}/${totalSize}\x1b[0m | \x1b[31m${speed}\x1b[0m |\x1b[34m est: ${remainingTimeString}\x1b[0m`;
                        const clearLine = "\x1B[0G";
                        const clearToEndOfLine = "\x1B[0K";
                        process.stdout.write(
                            clearLine + clearToEndOfLine + progressString
                        );
                    });

                    videoReadableStream.on("end", async () => {
                        clearInterval(updateInterval);
                        process.stdout.write("\n");
                        console.log(
                            `${setting.plFolder
                                ? `${videoFolder}/\x1b[32m${videoTitle} \x1b[0m.mp4`
                                : `\x1b[32m${videoTitle} \x1b[0m.mp4`
                            } Download completed!`
                        );
                        Playlist.splice(indexOfVideo, 1);
                        fs.writeFileSync(
                            filePath,
                            JSON.stringify(playlistData, null, "    ")
                        );
                        if (Playlist.length === 0) {
                            fs.unlinkSync(filePath);
                            console.log("    All videos have been downloaded!");
                            return;
                        }
                        if (indexOfVideo < Playlist.length) {
                            console.log(
                                `${purpleColor}${Playlist.length
                                }${resetColor} ${Playlist.length === 1 ? "video" : "videos"
                                } remaining`
                            );
                            process.stdout.write("\n");
                            await wait(8);
                            downloadVideo(indexOfVideo);
                        }
                    });
                    videoReadableStream.pipe(videoFile);
                } catch (error) { }
            }

            // Call the function to start downloading the first video
            downloadVideo(indexOfVideo);
        }
    })();
} else {
    console.log("Error: the flag does not exist");
    process.exit(0);
}
