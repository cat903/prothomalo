const puppeteer = require('puppeteer');
const fs = require('fs');

async function delay(ms) {
    await new Promise(resolve => {
        setTimeout(resolve, ms)
    })
}

function storeLinks(obj) {
    for (let k = 0; k < obj.length; k++) {
        fs.appendFileSync('storeLink.txt', obj[k].article_link + '\n');
    }
}

function appendObject(obj) {
    if (!fs.existsSync('prothomalo.json')) {
        //create new file if not exist
        fs.writeFileSync("prothomalo.json", JSON.stringify([]))
    }
    var dbFile = fs.readFileSync('./prothomalo.json');
    var db = JSON.parse(dbFile);
    for (let k = 0; k < obj.length; k++) {
        db.push(obj[k]);
    }
    var dbJSON = JSON.stringify(db);
    fs.writeFileSync('./prothomalo.json', dbJSON);
}

async function initiate() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, userDataDir: './userdata', executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0)
    await page.goto('https://www.prothomalo.com/collection/latest', { waitUntil: 'networkidle2' });
    await delay(5000);
    if (!fs.existsSync('storeLink.txt')) {
        //create new file if not exist
        fs.writeFileSync("storeLink.txt", '');
    }
    articleLinkarr = (fs.readFileSync('storeLink.txt', { encoding: 'utf8' })).split('\n')
    let articles = await page.evaluate(async (articleLinkarr) => {
        let arrObj = [];
        articles = document.querySelectorAll('.left_image_right_news.news_item.wMFhj');
        // while(articles.length<100){
        //    document.querySelector('.more._7ZpjE').click();
        //    await new Promise(resolve=>{setTimeout(resolve,5000)});
        //    articles = document.querySelectorAll('.left_image_right_news.news_item.wMFhj');
        // }
        for (let i = 0; i < articles.length; i++) {
            const articleHeadline = articles[i].querySelector('div > h3').innerText
            const articleLink = articles[i].querySelector('a').getAttribute('href')
            if (!(articleLink.includes('video') || articleLink.includes('fun') || articleLink.includes('photo'))) {
                if (!articleLinkarr.includes(articleLink)) {
                    arrObj.push({ article_headline: articleHeadline, article_link: articleLink })
                }
            }
        };
        return arrObj;
    }, articleLinkarr)
    for (let i = 0; i < articles.length; i++) {
        await page.goto(articles[i].article_link, { waitUntil: 'networkidle2' })
        let articleText = await page.evaluate(() => {
            let content = '';
            para = document.querySelectorAll('.story-element.story-element-text');
            for (let j = 0; j < para.length; j++) {
                if (!para[j].className.includes('also')) {
                    content = content + para[j].innerText
                }
            }
            return content;
        })
        let articleDate = await page.evaluate(()=>{
            let articleDate;
            try{articleDate = document.querySelector('.time-social-share-wrapper time').getAttribute('datetime')}catch(e){}
            return articleDate
        })
        await page.evaluate(() => {
            try { document.querySelector('.print-metype-reactions-with-comments').scrollIntoView({ behavior: 'smooth' }) } catch (e) { }
        })
        await delay(10000)
        let comments = [];
        try {
            const elementHandle = await page.$('iframe.metype-iframe')
            const frame = await elementHandle.contentFrame();
            comments = await frame.evaluate(() => {
                x = document.querySelectorAll('.single-thread-container');
                commentsObj = [];
                if (x.length) {
                    for (let i = 0; i < x.length; i++) {
                        commenterName = x[i].querySelector('.author-name').innerText
                        commentBody = x[i].querySelector('.comment-body').innerText
                        dateTime = x[i].querySelector('.timestamp').getAttribute('datetime')
                        commentsObj.push({ commentAuthor: commenterName, commentBody: commentBody, commentDate: dateTime })
                    }
                }
                return commentsObj;
            })
        } catch (e) { }
        articles[i].article_category = ((articles[i].article_link).split('/'))[3];
        articles[i].article_date = articleDate
        articles[i].article_text = articleText;
        articles[i].article_comments = comments
    }
    
    if(articles.length){
        appendObject(articles);
        storeLinks(articles);
    }
    await browser.close();
}

(async function(){
    while(1){
        await initiate();
        await delay(60000)
    }
})()