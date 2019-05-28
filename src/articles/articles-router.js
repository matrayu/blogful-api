const express = require('express');
const logger = require('../logger');
const ArticlesService = require('./articles-service');
const xss = require('xss');

const articlesRouter = express.Router();
const jsonParser = express.json();

const sterileArticle = article => ({
    id: article.id,
    style: article.style,
    content: xss(article.content),
    date_published: article.date_published,
    title: xss(article.title),
});

articlesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        ArticlesService.getAllArticles(knexInstance)
            .then(article => {
                res.json(article.map(sterileArticle))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db')
        const { title, style, content } = req.body;
        const newArticle = { title, style, content };

        for (const [key, value] of Object.entries(newArticle)) {
            if (value == null) {
                logger.error(`${key} value is empty`)
                return res
                    .status(400)
                    .send({
                        error: `Missing ${key} in the request body`
                    })
            }
        }

        ArticlesService.insertArticle(knexInstance, newArticle)
            .then(article => {
                logger.info(`Article with id ${article.id} created`)
                res
                    .status(201)
                    .location(`/articles/${article.id}`)
                    .json(sterileArticle(article))
            })
            .catch(next)
})

articlesRouter
    .route('/:article_id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { article_id } = req.params;

        ArticlesService.getById(knexInstance, article_id)
            .then(article => {
                if (!article) {
                    logger.error(`Article with id ${article_id} not found`);
                    return res
                        .status(404)
                        .json({ error: `Article with id ${article_id} not found` })
                }
                res.article = article // save the article for the next middleware
                next() //call next so the next middleware happens!
            })
            .catch(next)
    })
    .get((req, res, next) => {
        console.log(res.article)
        res.json(sterileArticle(res.article))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { article_id } = req.params;

        ArticlesService.deleteArticle(knexInstance, article_id)
            .then(() => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = articlesRouter;
