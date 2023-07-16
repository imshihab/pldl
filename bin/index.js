#!/usr/bin/env node

'use strict';
process.stdout.write(`\u001b]0;YT Playlist downloader\u0007`);

const ytdl = require('ytdl-core');
const { google } = require('googleapis');
const fs = require('node:fs');
const pkg = require('./../package.json');
const setting = require('./settings.json');
const { generateProgressBar, formatBytes, sanitizeFilename, help } = require('./utils');
const path = require('node:path');

const Args = process.argv.slice(2);
if (Args.length === 0) help();
const root = process.cwd();
const BASE_URL = 'https://www.youtube.com/watch?v=';


const versionFlags = new Set(['-v', '--v', '--version']);
const helpFlags = new Set(['-h', '--h', '--help']);

const arg = Args[0];
const isDash = arg.startsWith('-');
const isApiFlag = arg.startsWith('setting.key=');
const isPlFolderFlag = arg.startsWith('setting.plFolder=');
const isMaxResultsFlag = arg.startsWith('setting.maxResults=');
const playlistId = arg;

// ANSI escape code for purple color
const purpleColor = '\x1b[35m';
// ANSI escape code to reset color
const resetColor = '\x1b[0m';


if (versionFlags.has(arg)) {
    console.log(`pldl/${purpleColor}${pkg.version}${resetColor} Node: ${process.version}`);
    process.exit(0);
} else if (helpFlags.has(arg)) {
    help();
} else if (isApiFlag) {
    const apiKey = arg.split('=')[1];
    setting.key = apiKey;
    fs.writeFile(`${__dirname}/settings.json`, JSON.stringify(setting, null, '    '), (err) => {
        if (err) {
            console.error('Error writing settings file:', err);
            process.exit(1);
        }
        console.log('API key saved successfully!');
        process.exit(0);
    });
} else if (isPlFolderFlag) {
    const value = arg.split('=')[1].trim();
    setting.plFolder = value === 'true';
    fs.writeFile(`${__dirname}/settings.json`, JSON.stringify(setting, null, '    '), (err) => {
        if (err) {
            console.error('Error writing settings file:', err);
            process.exit(1);
        }
        console.log(`Setting "plFolder" saved successfully! New value: ${setting.plFolder}`);
        process.exit(0);
    });
} else if (isMaxResultsFlag) {
    const value = arg.split('=')[1].trim();
    setting.maxResults = parseInt(value) > 240 ? 240 : parseInt(value);
    fs.writeFile(`${__dirname}/settings.json`, JSON.stringify(setting, null, '    '), (err) => {
        if (err) {
            console.error('Error writing settings file:', err);
            process.exit(1);
        }
        console.log(`Setting "maxResults" saved successfully! New value: ${setting.maxResults}`);
        process.exit(0);
    });
} else if (!isDash && !isPlFolderFlag && !isApiFlag && !isMaxResultsFlag) {
    // Create a YouTube API client
    const youtube = google.youtube({
        version: 'v3',
        auth: setting.key,
    });

    // Check if the playlist file already exists
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
                    part: 'snippet',
                    id: playlistId,
                },
                (error, response) => {
                    if (error) {
                        console.error('Error:', error.message);
                        reject(error);
                    } else {
                        const playlist = response.data.items[0];
                        if (playlist) {
                            resolve(playlist.snippet.title);
                        } else {
                            reject(new Error('Playlist not found'));
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
            console.error('Error:', error.message);
            process.exit(1);
        }

        const filePath = path.join(__dirname, 'Playlist', `${playlistId}.json`);
        try {
            // Check if the playlist file already exists
            if (fs.existsSync(filePath)) {
                playlistData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                throw new Error();
            }

            let nextPageToken = null;
            let processedItemCount = 0;
            do {
                const response = await youtube.playlistItems.list({
                    // @ts-ignore
                    part: 'snippet',
                    playlistId: playlistId,
                    maxResults: setting.maxResults,
                    pageToken: nextPageToken,
                });
                const items = response.data.items;
                // Extract video details from the playlist items
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
                    // Track the number of processed items
                    processedItemCount++;

                    // Break the loop if the desired limit is reached
                    if ((processedItemCount + 2) === setting.maxResults) {
                        nextPageToken = null;
                        break;
                    }
                }
                nextPageToken = response.data.nextPageToken;
            } while (nextPageToken);

            fs.writeFileSync(filePath, JSON.stringify(playlistData, null, '    '));
        } catch (error) {

        } finally {
            let indexOfVideo = 0;
            const { Title, Playlist } = playlistData;
            const videoFolder = setting.plFolder ? sanitizeFilename(Title) : '';
            const playlistFilePath = setting.plFolder ? path.join(root, videoFolder, `${Title}.json`) : path.join(root, `${sanitizeFilename(Title)}.json`);
            const videoFolderExists = fs.existsSync(path.join(root, videoFolder));

            if (setting.plFolder && !videoFolderExists) {
                fs.mkdirSync(path.join(root, videoFolder));
            }

            if (!fs.existsSync(playlistFilePath)) {
                fs.writeFileSync(playlistFilePath, JSON.stringify(playlistData, null, '    '));
            }

            /**
             * @param {number} index
             */
            async function downloadVideo(index) {
                const playlistVideo = Playlist[index];
                const link = playlistVideo.link;
                try {
                    const info = await ytdl.getInfo(link);
                    const formats = ytdl.filterFormats(info.formats, 'videoonly');
                    const mp4Formats = formats.filter((format) => format.container === 'mp4');
                    // @ts-ignore
                    mp4Formats.sort((a, b) => b.quality - a.quality);
                    const highestQualityFormat = mp4Formats[0];
                    const videoReadableStream = ytdl(link, { format: highestQualityFormat });

                    const videoTitle = playlistVideo.title;
                    const videoPath = setting.plFolder ? path.join(root, videoFolder, `${videoTitle}.mp4`) : path.join(root, `${videoTitle}.mp4`);
                    const videoFile = fs.createWriteStream(videoPath);

                    console.log(`Downloading \x1b[32m${videoTitle} ...\x1b[0m`);
                    let downloadedBytes = 0;
                    const totalBytes = parseInt(highestQualityFormat.contentLength); // Parse contentLength to ensure it's a number
                    let prevDownloadedBytes = 0;
                    let prevTimestamp = Date.now();

                    videoReadableStream.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        const currentTimestamp = Date.now();
                        const timeDiff = (currentTimestamp - prevTimestamp) / 1000; // in seconds
                        const downloadSpeed = (downloadedBytes - prevDownloadedBytes) / timeDiff; // bytes per second

                        prevDownloadedBytes = downloadedBytes;
                        prevTimestamp = currentTimestamp;

                        const progress = (downloadedBytes / totalBytes) * 100;
                        const progressBar = generateProgressBar(progress);
                        const speed = formatBytes(downloadSpeed);

                        const progressString = `${progressBar} ${progress.toFixed(2)}% | ${speed}`;

                        const clearLine = '\x1B[0G'; // Move the cursor to the beginning of the line
                        const clearToEndOfLine = '\x1B[0K'; // Clear from the cursor position to the end of the line

                        process.stdout.write(clearLine + clearToEndOfLine + progressString);
                    });

                    videoReadableStream.on('end', () => {
                        process.stdout.write('\n');
                        console.log(`${setting.plFolder ? `${videoFolder}/\x1b[32m${videoTitle} \x1b[0m.mp4` : `\x1b[32m${videoTitle} \x1b[0m.mp4`} Download completed!`);
                        Playlist.splice(indexOfVideo, 1);
                        fs.writeFileSync(filePath, JSON.stringify(playlistData, null, '    '));

                        if (Playlist.length === 0) {
                            fs.unlinkSync(filePath);
                            console.log('All videos have been downloaded!');
                            return;
                        }

                        if (indexOfVideo < Playlist.length) {
                            console.log(`${purpleColor}${Playlist.length}${resetColor} ${Playlist.length === 1 ? "video" : "videos"} remaining`);
                            process.stdout.write('\n');
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
    console.log('Error: the flag does not exist');
    process.exit(0);
}
