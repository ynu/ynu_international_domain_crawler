const fs = require('fs');
const readline = require('readline');

const ora = require('ora');
const chalk = require('chalk');

/**
 * read the file and return an array of the hosts
 * @param {*} filePath the path of input text file
 */
const getHosts = async (filePath = 'result.txt') => {
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
    const hosts = [];
    for await (const line of rl) {
      hosts.push(line);
    }
    return hosts;
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
  const hosts = await getHosts();
  const topLevelDomains = new Set([]);
  const topLevelDomainPattern = /.*\.(\w+\.\w+)/;
  const ipDomainPattern = /\d+\.\d+\.\d+\.\d+/;
  for (const host of hosts) {
    const ipMatch = host.match(ipDomainPattern);
    const domainMatch = host.match(topLevelDomainPattern);
    if (ipMatch) {
      topLevelDomains.add(ipMatch[0]);
    } else if (domainMatch) {
      topLevelDomains.add(domainMatch[1]);
    }
  }
  // sort the domains, so that the ip appears in the first of the list
  const sortedTopLevelDomains = Array.from(topLevelDomains).sort();
  await saveResult(sortedTopLevelDomains, 'topLevelDomains.txt');
  for (const topLevelDomain of sortedTopLevelDomains) {
    console.info(`${topLevelDomain}`);
  }
})();
