const express = require('express');
const logger = require('../logger');
const ArticlesService = require('./articles-service');
const xss = require('xss');
const path = require('path'); //Node's internal module - access Posix

const articlesRouter = express.Router();
const jsonParser = express.json();

const sterileArticle = article => ({
    id: article.id,
    style: article.style,
    content: xss(article.content),
    date_published: article.date_published,
    title: xss(article.title),
    author: article.author
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
        const { title, style, content, author } = req.body;
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

        //add author to the newArticle object
        newArticle.author = author

        ArticlesService.insertArticle(knexInstance, newArticle)
            .then(article => {
                logger.info(`Article with id ${article.id} created`)
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${article.id}`))
                    .json(sterileArticle(article))
            })
            .catch(next)
})

articlesRouter
    .route('/:article_id')
    //.all responds with a 404 for every request that's specific to an article 
    //where the identifier references an entity that doesn't exist
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
    .patch(jsonParser, (req, res, next) => {
        //res.status(204).end() //test to check things are working
        const knexInstance = req.app.get('db');
        const { article_id } = req.params;
        const { title, style, content } = req.body;
        const articleToPatch = { title, content, style }

        const numberOfValues = Object.values(articleToPatch).filter(Boolean).length;
        
        if (numberOfValues === 0) {
            logger.error(`Request body must contain either 'title', 'style' or 'content'`)
            return res
                .status(400)
                .json({
                    error: `Request body must contain either 'title', 'style' or 'content'` 
                })
        }
        
        ArticlesService.updateArticle(knexInstance, article_id, articleToPatch)
            .then(numRowsAffected => {
                res
                    .status(204)
                    .end()
            })
            .catch(next)
    })

module.exports = articlesRouter;
