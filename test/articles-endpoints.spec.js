const { makeArticlesArray } = require('./articles.fixtures')
const knex = require('knex');
const app = require('../src/app');

describe(`Articles Endpoints`, function() {
    let db;

    //passing description as the first argument for clarity
    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db('blogful_articles').truncate())
    
    afterEach('cleanup', () => db('blogful_articles').truncate())

    describe(`GET /articles`, () => {
        context('Given no articles', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/articles')
                    .expect(200, [])
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
            beforeEach('insert articles', () => {
                return db
                    .into('blogful_articles')
                    .insert(testArticles)
            })
    
            it(`responds with 200 and all of the articles`, () => {
                return supertest(app)
                    .get('/articles')
                    .expect(200, testArticles)
            })
        })
    })

    describe(`GET /articles/:article_id`, () => {
        context('Given no articles', () => {
            it('responds with a 404 and error', () => {
                const articleId = 123456
                return supertest(app)
                    .get(`/articles/${articleId}`)
                    .expect(404, {
                        error: `Article with id ${articleId} not found`
                    })
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_articles')
                    .insert(testArticles)
            })

            it('responds with 200 and the specified article', () => {
                const articleId = 1
                const expectedArticle = testArticles[articleId - 1]
                return supertest(app)
                    .get(`/articles/${articleId}`)
                    .expect(200, expectedArticle)
            })
        })
    })

    describe('POST /articles', () => {
        it('creates a new article and response with a 201', () => {
            this.retries(3)
            const newArticle = {
                title: 'new title',
                style: 'Listicle',
                content: 'new content',
            };
            return supertest(app)
                .post('/articles')
                .send(newArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newArticle.title)
                    expect(res.body.style).to.eql(newArticle.style)
                    expect(res.body.content).to.eql(newArticle.content)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/articles/${res.body.id}`)
                    const expected = new Date().toLocaleString
                    const actual = new Date(res.body.data_published).toLocaleString
                    expect(actual).to.eql(expected)
                })
                //we used an implicit return inside the then block so that 
                //Mocha knows to wait for both requests to resolve
                .then(postRes => 
                    supertest(app)
                        .get(`/articles/${postRes.body.id}`)
                        .expect(postRes.body)
                )
        })

    })
})