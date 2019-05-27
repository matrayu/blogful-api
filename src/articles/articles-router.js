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

        if (!title) {
            logger.error('Title is required');
            return res
                .status(400)
                .send('A title must be provided');
        }

        if (!style) {
            logger.error('Style is required');
            return res
                .status(400)
                .send('A style must be provided');
        }

        if (!content) {
            logger.error('Content is required');
            return res
                .status(400)
                .send('Content must be provided');
        }
        ArticlesService.insertArticle(knexInstance, newArticle)
            .then(article => {
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
