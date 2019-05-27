require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const ArticlesService = require('./articles-service')

const app = express()
const jsonParser = express.json()

const morganOption = (NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganOption))
app.use(cors())
app.use(helmet())



app.get('/articles', (req, res, next) => {
    const knexInstance = req.app.get('db')
    ArticlesService.getAllArticles(knexInstance)
        .then(articles => {
            res.json(articles)
        })
        .catch(next)
})

app.get('/articles/:article_id', (req, res, next) => {
    const knexInstance = req.app.get('db')
    ArticlesService.getById(knexInstance, req.params.article_id)
        .then(article => {
            if (!article) {
                return res.status(404).json({
                    error: {
                        message: `Article doesn't exist`
                    }
                })
            }
            res.json(article)
        })
        .catch(next)
})

app.post('/articles', jsonParser, (req, res, next) => {
    const knexInstance = req.app.get('db')
    const { title, style, content } = req.body
    const newArticle = { title, content, style }
    ArticlesService.insertArticle(knexInstance, newArticle)
        .then(article => {
            res
                .status(201)
                .location(`/articles/${article.id}`)
                .json(article)
        })
        .catch(next)
})

app.get('/', (req, res) => {
    res.send('Hello, boilerplate!')
})

app.use((error, req, res, next) => {
    let response
    if (NODE_ENV === 'production') {
        response = { error: { message: 'server error' }}
    } else {
        response = { error }
    }
    res.status(500).json(response)
})

module.exports = app