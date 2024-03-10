/**
 * @file scraper.js
 * @brief pixiv.com artwork dataset curator
 * @author luethan2025
 * @release 2024
 */
const puppeteer = require('puppeteer-extra');
const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require('puppeteer');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(
  AdblockerPlugin({
    // optionally enable Cooperative Mode for several request interceptors
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
  })
);
const { Command, Option } = require('commander');
const { getReasonPhrase } = require('http-status-codes');
const { BadConnectionError } = require('./lib/error');
const { download } = require('./common_utils');

/** Main routine */
(async () => {
  const program = new Command();
  program.name('scraper').description('Pixiv dataset').version('0.0.1');

  program
    .addOption(new Option('--url <string>', 'URL to artist on pixiv.com'))
    .addOption(
      new Option('--directory <string>', 'destination directory').default(
        './data/'
      )
    );

  program.parse(process.argv);

  const options = program.opts();
  const { url, directory } = options;

  const browser = await puppeteer.launch({
    args: [
      '--disable-web-security',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials'
    ],
    defaultViewport: {
      width: 1366,
      height: 768
    },
    headless: true
  });

  const page = await browser.newPage();

  console.log(`Navigating to ${url + '/illustrations?p=1'}`);
  const response = await page.goto(url + '/illustrations?p=1', {
    waitUntil: 'networkidle2'
  });

  const status = response.status();
  if (status !== 200) {
    console.log('Connection was unsucessful. Try again at another time.');
    throw new BadConnectionError(
      `Status expected HTTP ${200} ${getReasonPhrase(200)}, ` +
        `but was HTTP ${status} ${getReasonPhrase(status)}`
    );
  }
  console.log('Connection was sucessful\n');
  await download(page, url, directory);

  await browser.close();
})();
