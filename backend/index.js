const express = require('express');
const app = express();
const { Builder, By, Key, until, Condition } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { sleep } = require('sleep');
const request = require('request');
const rp = require('request-promise');
// const zlib = require('zlib');
// const https = require('https');

function parseImage(imageHTML) {
  if (imageHTML.includes("img alt=")) {
    match = imageHTML.match(/<a href="(.*?)">.*<img alt="([\s\S]*?)".*src="(.*?)"/);
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

async function fleshOut(item) {
  console.log(item.url);
  let body = await rp(item.url);
  let rawInfo = body.match(/window\._sharedData = ({.*);<\/script>/);
  if (rawInfo.length >= 2) {
    let data = JSON.parse(rawInfo[1]);
    let modified = {
      timestamp: (data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["taken_at_timestamp"]),
      caption: (data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["edge_media_to_caption"]["edges"][0]["node"]["text"]),
      user: (data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["owner"]["username"]),
      comment_count: (data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["edge_media_to_comment"]["count"]),
      like_count: (data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["edge_media_preview_like"]["count"]),
      is_video: !!(data["entry_data"]["PostPage"][0]["graphql"]["shortcode_media"]["is_video"]),
      url: item.url,
      image_url: item.image_url,
    };
    return modified;
  } else {
    console.log(item.url);
    return null;
  }
}

async function pollHashtag(hashtag, number, min_likes) {
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
    let fleshedOutPictures = [];
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

      imageElements.forEach(async (item) => {
        if (!pictures.includes(item)) {
          pictures.push(item);
          let a = await fleshOut(item);
          if (a && a.like_count >= min_likes && !a.is_video) {
            fleshedOutPictures.push(a);
          }
        }
      })

      // Keep scrolling to the bottom until there are new images
      await driver.executeScript(`
          window.scrollTo(0,document.body.scrollHeight);
      `);

      // Wait one second to load
      await sleep(1);
    } while (fleshedOutPictures.length < number);

    fleshedOutPictures = fleshedOutPictures.slice(0, number);

    console.log(fleshedOutPictures);
    console.log(fleshedOutPictures.length);
  } finally {
    await driver.quit();
  }
}

// Get the most recent 100 photos tagged 'dog' with over 20 likes
pollHashtag('dog', 150, 20);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => console.log('Example app listening on port 3000!'));