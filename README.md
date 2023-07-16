# pldl (YouTube Playlist Downloader)

pldl is a command-line interface (CLI) tool that allows you to easily download YouTube playlists. With pldl, you can specify the playlist ID and download all the videos within the playlist for offline viewing.

## Installation

To install pldl, run the following command:

```bash
npm install -g pldl
```

## Usage

To download a YouTube playlist using pldl, use the following command:

```bash
pldl {playlistID}
```

Replace `{playlistID}` with the ID of the YouTube playlist you want to download.

## Configuration

Before using pldl, you can configure the following settings:

### API Key

To set up your YouTube API key, follow these steps:

1. Obtain a YouTube Data API key from the [Google Developers Console](https://console.developers.google.com/).
2. Run the following command to configure pldl with your API key:

```bash
pldl setting.key='{api_key}'
```

Replace `{api_key}` with your YouTube Data API key.

### Playlist Folder

You can customize the folder behavior for playlist downloads using the following setting:

-   `playlistFolder`: Specifies the folder behavior for playlists. Available values are:
    -   `true`: Create a folder named after the playlist for each download.
    -   `false`: Download files directly into the current directory without creating a dedicated folder.

Example:

-   Set the YouTube API key:

```bash
pldl setting.key='YOUR_API_KEY'
```

-   Configure the folder creation option:

```bash
pldl setting.plFolder=true
```

When you set `plFolder` to `true`, pldl will create a folder with the same name as the playlist for each download. For example, if the playlist is named "My Playlist", pldl will create a folder named "My Playlist" and download all the videos inside it.

On the other hand, if you set `plFolder` to `false`, pldl will download the files directly into the current directory without creating a dedicated folder.

Choose the option that suits your preference and organization needs.

### Max Results

You can configure the maximum number of results to fetch from the playlist using the following setting:

-   `maxResults`: Specifies the maximum number of videos to download from the playlist. The default value is `24`, and the maximum value is `240`.

Example:

-   Set the maximum number of results to `100`:

```bash
pldl setting.maxResults=100
```

This setting allows you to control the number of videos to download from the playlist. Adjust it according to your requirements.


## Examples

Here are a few examples to illustrate the usage of pldl:

-   Download a playlist with ID `PL6zxxT4NC3TjfJZ5Di2kGifEvTd6zPZvj`:

```bash
pldl PL6zxxT4NC3TjfJZ5Di2kGifEvTd6zPZvj
```

-   Set the YouTube API key:

```bash
pldl setting.key='YOUR_API_KEY'
```

-   Set the folder creation option to create a dedicated folder for each playlist:

```bash
pldl setting.plFolder=true
```

-   Set the maximum number of results to `100`:

```bash
pldl setting.maxResults=100
```

## Important Note

Please note that downloading YouTube videos without proper authorization may violate YouTube's terms of service or copyright laws. Ensure that you have the necessary rights or permissions to download and use the videos from YouTube.

## License

pldl is released under the [MIT License](https://opensource.org/licenses/MIT).

## Feedback and Contributions

Your feedback and contributions are welcome! If you encounter any issues or have suggestions for improvements, please submit them on the [GitHub repository](https://github.com/imshihab/pldl).
