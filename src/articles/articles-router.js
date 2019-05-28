const express = require('express');
/* const uuid = require('uuid/v4');
const valid = require('validator'); */
const logger = require('../logger');
const ArticlesService = require('./articles-service');

const articlesRouter = express.Router();
const jsonParser = express.json();

articlesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        ArticlesService.getAllArticles(knexInstance)
            .then(articles => {
                res.json(articles)
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
                    .json(article)
            })
            .catch(next)
})

articlesRouter
    .route('/:article_id')
    .get((req, res, next) => {
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
                res.json(article)
            })
            .catch(next)
})

module.exports = articlesRouter;
