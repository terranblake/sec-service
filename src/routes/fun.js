const express = require('express')
const router = express.Router({ mergeParams: true });

const { redis } = require('@postilion/stores');

const shortid = require('shortid');
const week = 60 * 60 * 24;

router.get('/', async (req, res) => {
    const {
        query = {},
    } = req;

    if (query.url) {
        const id = shortid.generate();

        console.log(`creating id ${id} for url ${query.url}`);
        await redis.set(id, query.url, 'EX', week);

        return res.redirect(301, process.env.REDIRECT_URL + `/${id}`);
    }

    return res.status(200).send({ err: '🍆' });
});

router.get('/:id', async (req, res) => {
    const {
        params = {}
    } = req;

    if (params.id) {
        const url = await redis.get(params.id);
        if (url) {
            return res.redirect(301, url);
        }
    }

    res.redirect(301, process.env.REDIRECT_URL);
});

module.exports = router;