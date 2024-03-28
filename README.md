# Pixiv Dataset
This command-line tool downloads images from pixiv.com. You can build your dataset by prompting the URLs of several artists.

## Getting Started
To use this tool, you will need [Node.js](https://nodejs.org/en), which you should install on your machine beforehand. <br>

Clone this repository to your machine:
```shell
> git clone https://github.com/luethan2025/pixiv_data.git
```
Now install the project's dependencies and configure Puppeteer by 'cd'-ing into the root of this project and running the command:
```shell
> sh setup.sh
```

# Usage
Once all dependencies have been installed and Puppeteer has been properly configured, you can now use create your dataset.
```
Usage: scraper [options]

Pixiv dataset

Options:
  -V, --version         output the version number
  --url <string>        URL to artist on pixiv.com
  --directory <string>  destination directory (default: "./data/")
  -h, --help            display help for command
```
At minimum you must at least set the url argument to successfully run the program. The dataset will be found in `./data/` by default, however, if you set the directory argument the dataset will be found there instead.
