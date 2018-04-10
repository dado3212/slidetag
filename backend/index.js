const express = require('express');
const app = express();
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function pollHashtag(hashtag, number) {
  // Build a new driver for the browser searching
  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().headless().windowSize({ width: 1080, height: 920 }))
    .build();

  try {
    // Search for the hashtag
    await driver.get(`https://www.instagram.com/explore/tags/${hashtag}/`);
    // Create an empty array
    let pictures = [];
    // _6d3hm _mnav9

    // Scroll up and down until there's enough photos
    let imageElements = await driver.findElements(By.css('._6d3hm._mnav9 ._mck9w._gvoze._tn0ps'));
    let imagesCode = await Promise.all(imageElements.map(a => a.getAttribute('innerHTML')));

    let images = imagesCode.map(imageHTML => {
      match = imageHTML.match(/<a href="(.*?)">.*<img alt="([\s\S]*?)".*src="(.*?)"/);
      return {
        url: `https://www.instagram.com${match[1]}`,
        caption: `${match[2]}`,
        image_url: `${match[3]}`,
      };
    });

    console.log(images);

    let source = await driver.getPageSource();
    // console.log(source);
  } finally {
    await driver.quit();
  }
}

// Get the most recent 100 photos tagged 'dog'
pollHashtag('dog', 100);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));