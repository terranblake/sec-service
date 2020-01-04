const express = require('express')
const router = express.Router({ mergeParams: true });

const { redis } = require('@postilion/stores');

const shortid = require('shortid');
const week = 60 * 60 * 24;

router.get('/', async (req, res) => {
    const { query = {} } = req;

    if (query.url) {
        const id = shortid.generate();

        console.log(`creating id ${id} for url ${query.url}`);
        await redis.set(id, query.url, 'EX', week);
        const url = process.env.REDIRECT_URL + `/${id}`;

        return res.status(200).send(`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>🍑</title>
                    <link rel="stylesheet" href="css/styles.css?v=1.0">
                </head>
                    <body>
                        <p>${url}</p>
                    </body>
            </html>
        `);
    }

    return res.status(200).send({ err: '🍆' });
});

router.get('/:id', async (req, res) => {
    const { params = {} } = req;

    if (params.id) {
        const url = await redis.get(params.id);
        if (url) {
            return res.redirect(301, url);
        }
    }

    res.redirect(301, process.env.REDIRECT_URL);
});

module.exports = router;