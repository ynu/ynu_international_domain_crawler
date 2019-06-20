const fs = require('fs');
const readline = require('readline');

const ora = require('ora');
const chalk = require('chalk');

const puppeteer = require('puppeteer-core');

// require and configure dotenv. see https://www.npmjs.com/package/dotenv
require('dotenv').config();

/**
 * read the file and return an array of the index url records
 * @param {*} filePath the path of input text file
 */
const getIndexUrls = async (filePath = 'index_urls.txt') => {
  let fileStream = null;
  try {
    fileStream = fs.createReadStream(filePath);
    fileStream.on('error', function(error) {
      if (error.code === 'ENOENT') {
        console.log(`${filePath} not found!`);
        process.exit(1);
      } else {
        throw error;
      }
    });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    const domains = [];
    for await (const line of rl) {
      domains.push(line);
    }
    return domains;
  } catch (error) {
    throw error;
  } finally {
    fileStream.close();
  }
};

/**
 * sava the result to a specified file
 * @param {*} hosts the result hosts
 * @param {*} filePath the file path which save to
 */
const saveResult = async (hosts, filePath = 'result.txt') => {
  let fileStream = null;
  try {
    fileStream = fs.createWriteStream(filePath);
    fileStream.write(Array.from(hosts).join('\n'));
  } catch (error) {
    throw error;
  } finally {
    fileStream.close();
  }
};

(async () => {
  // use the local installed Chrome and set proxy for easy connecting
  const browser = await puppeteer.launch({
    ...(process.env.CHROME_PATH && {
      executablePath: `${process.env.CHROME_PATH}`,
    }),
    ...(process.env.PROXY_SERVER && {
      args: [
        `--proxy-server=${process.env.PROXY_SERVER}`,
        `--proxy-bypass-list=localhost, 127.0.0.1`,
      ],
      headless: true,
    }),
  });
  const indexUrls = await getIndexUrls('index_urls.txt');
  let spinner = ora(`${chalk.yellow('starting process...')}`).start();
  const hosts = new Set([]);

  const page = await browser.newPage();

  // https://github.com/GoogleChrome/puppeteer/issues/1680
  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {
    // record the url and host
    const url = interceptedRequest.url();
    const host = new URL(url).host;
    hosts.add(host);
    spinner.succeed(
      `found host: ${chalk.green(host)} from url: ${chalk.yellow(url)}`
    );
    interceptedRequest.continue();
  });

  for (let i = 0; i < indexUrls.length; i++) {
    const indexUrl = indexUrls[i];
    spinner = ora(
      `Detecting (${i}/${indexUrls.length}) ${chalk.yellow(indexUrl)}`
    ).start();
    try {
      // may throw Error: net::ERR_CONNECTION_RESET
      // see https://github.com/GoogleChrome/puppeteer/issues/1477
      await page.goto(indexUrl, { waitUntil: 'load', timeout: 60000 });
    } catch (error) {
      spinner.fail(error.message);
    }
  }

  // clean up
  await browser.close();
  spinner.stop();

  // output the result
  console.info(`${chalk.green('Found the following host')}`);
  for (const host of hosts) {
    console.info(`${chalk.green(host)}`);
  }

  // save the result
  saveResult(hosts);
})();
