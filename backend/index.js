const express = require('express');
const app = express();
const { Builder, By, Key, until, Condition } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { sleep } = require('sleep');

function parseImage(imageHTML) {
  if (imageHTML.includes("img alt=")) {
    match = imageHTML.match(/<a href="(.*?)">.*<img alt="([\s\S]*?)".*src="(.*?)"/);
    console.log(imageHTML);
    return {
      url: `https://www.instagram.com${match[1]}`,
      caption: `${match[2]}`,
      image_url: `${match[3]}`,
    };
  } else {
    match = imageHTML.match(/<a href="(.*?)">.*<img.*src="(.*?)"/);
    return {
      url: `https://www.instagram.com${match[1]}`,
      caption: '',
      image_url: `${match[2]}`,
    };
  }
}

async function pollHashtag(hashtag, number) {
  // Build a new driver for the browser searching
  let driver = await new Builder()
    .forBrowser('chrome')
    // .setChromeOptions(new chrome.Options().headless().windowSize({ width: 1080, height: 920 }))
    .build();

  try {
    // Search for the hashtag
    await driver.get(`https://www.instagram.com/explore/tags/${hashtag}/`);
    // Create an empty array
    let pictures = [];
    // _6d3hm _mnav9

    // Inject code to scroll up and down until there's enough photos
    let customID = 'slidetag-custom-div-ended';
    let numFailed = 0;
    var currentCount = 0;
    var tagName = '._6d3hm._mnav9 ._mck9w._gvoze._tn0ps';
    do {
      // Get all of the currently loaded image tags
      let imageTags = await driver.findElements(By.css(tagName));
      let imageHTMLs = await Promise.all(imageTags.map(a => a.getAttribute('innerHTML')));
      let imageElements = imageHTMLs.map(element => parseImage(element));

      imageElements.forEach((item) => {
        if (!pictures.includes(item)) {
          pictures.push(item);
        }
      })

      // Keep scrolling to the bottom until there are new images
      await driver.executeScript(`
          window.scrollTo(0,document.body.scrollHeight);
      `);

      // Wait one second to load
      await sleep(1);
    } while (pictures.length < number);

    pictures = pictures.slice(0, number);

    console.log(pictures);
    console.log(pictures.length);
  } finally {
    await driver.quit();
  }
}

// Get the most recent 100 photos tagged 'dog'
pollHashtag('dog', 150);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));