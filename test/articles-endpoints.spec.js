const { makeArticlesArray, makeMaliciousArticle  } = require('./articles.fixtures');
const { makeUsersArray } = require('./users.fixtures');
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

    //raw() method is how you execute arbitrary SQL in knex
    //before('clean the table', () => db.raw('TRUNCATE blogful_articles, blogful_users, blogful_comments RESTART IDENTITY CASCADE'))

    afterEach('cleanup', () => db.raw('TRUNCATE blogful_articles, blogful_users, blogful_comments RESTART IDENTITY CASCADE'))

    describe(`GET /api/articles`, () => {
        context('Given no articles', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, [])
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
            const testUsers = makeUsersArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert(testArticles)
                    })
            })
    
            it(`responds with 200 and all of the articles`, () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, testArticles)
            })
        })

        context('Given an XXS attack article', () => {
            const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
            const testUsers = makeUsersArray();

            beforeEach('insert malicious article', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert([ maliciousArticle ])
                    })
            })

            it('removes XXS attack content', () => {
                return supertest(app)
                    .get(`/api/articles`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body[0].title).to.eql(expectedArticle.title)
                        expect(res.body[0].content).to.eql(expectedArticle.content)
                    })
            })
        })
    })

    describe(`GET /api/articles/:article_id`, () => {
        context('Given no articles', () => {
            it('responds with a 404 and error', () => {
                const articleId = 123456
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
                    .expect(404, {
                        error: `Article with id ${articleId} not found`
                    })
            })
        })

        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
            const testUsers = makeUsersArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                        .into('blogful_articles')
                        .insert(testArticles)
                    })
            })

            it('responds with 200 and the specified article', () => {
                const articleId = 1
                const expectedArticle = testArticles[articleId - 1]
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
                    .expect(200, expectedArticle)
            })
        })

        context('Given an XXS attack article', () => {
            const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
            const testUsers = makeUsersArray();

            beforeEach('insert malicious article', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert([ maliciousArticle ])
                    })
            })

            it('removes XXS attack content', () => {
                return supertest(app)
                    .get(`/api/articles/${maliciousArticle.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedArticle.title)
                        expect(res.body.content).to.eql(expectedArticle.content)
                    })
            })
        })
    })

    describe('POST /api/articles', () => {
        it('creates a new article and response with a 201', () => {
            this.retries(3)
            const newArticle = {
                title: 'new title',
                style: 'Listicle',
                content: 'new content',
            };
            return supertest(app)
                .post('/api/articles')
                .send(newArticle)
                .expect(201)
                .expect(res => {
                    expect(res.body.title).to.eql(newArticle.title)
                    expect(res.body.style).to.eql(newArticle.style)
                    expect(res.body.content).to.eql(newArticle.content)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`)
                    const expected = new Date().toLocaleString
                    const actual = new Date(res.body.date_published).toLocaleString
                    expect(actual).to.eql(expected)
                })
                //we used an implicit return inside the then block so that 
                //Mocha knows to wait for both requests to resolve
                .then(postRes => 
                    supertest(app)
                        .get(`/api/articles/${postRes.body.id}`)
                        .expect(postRes.body)
                )
        })

        const requiredFields = ['title', 'style', 'content'];

        requiredFields.forEach(field => {
            const newArticle = {
                title: 'new title',
                style: 'new style',
                content: 'new content',
            }

            it(`responds with 400 and an error message when the ${field} is missing`, () => {
                delete newArticle[field];

                return supertest(app)
                    .post('/api/articles')
                    .send(newArticle)
                    .expect(400, {
                        error: `Missing ${field} in the request body`
                    })
            })
        })

        context('Given an XXS attack article', () => {
            const { maliciousArticle, expectedArticle } = makeMaliciousArticle();
            const testUsers = makeUsersArray();

            beforeEach('insert malicious article', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                            .into('blogful_articles')
                            .insert([ maliciousArticle ])
                    })
            })

            it('removes XXS attack content', () => {
                return supertest(app)
                    .post(`/api/articles`)
                    .send(maliciousArticle)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.title).to.eql(expectedArticle.title)
                        expect(res.body.content).to.eql(expectedArticle.content)
                    })
            })
        })

    })

    describe('DELETE /api/articles/:article_id', () => {
        context('Given no article', () => {
            it('responds with a 404 and error', () => {
                const articleId = 123456
                return supertest(app)
                    .delete(`/api/articles/${articleId}`)
                    .expect(404, {
                        error: `Article with id ${articleId} not found`
                    })
            })
        })
        
        context('Given there are articles in the database', () => {
            const testArticles = makeArticlesArray();
            const testUsers = makeUsersArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                        .into('blogful_articles')
                        .insert(testArticles)
                    })
            })

            it('Response with 204 and removes the article', () => {
                const idToRemove = 2;
                const expectedArticles = testArticles.filter(article => article.id != idToRemove)
                return supertest(app)
                    .delete(`/api/articles/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles`)
                            .expect(expectedArticles)
                    )
            })
        })
    })

    describe('PATCH /api/articles', () => {
        context('Given no articles found to PATCH', () => {
            it('responds with a 404 and error', () => {
                const articleId = 123456
                return supertest(app)
                    .patch(`/api/articles/${articleId}`)
                    .expect(404, {
                        error: `Article with id ${articleId} not found`
                    })
            })
        })

        context('Given there is an article found to PATCH', () => {
            const testArticles = makeArticlesArray();
            const testUsers = makeUsersArray();

            beforeEach('insert articles', () => {
                return db
                    .into('blogful_users')
                    .insert(testUsers)
                    .then(() => {
                        return db
                        .into('blogful_articles')
                        .insert(testArticles)
                    })
            })

            it('responds with a 204 and updates the article', () => {
                const idToPatch = 2;

                const patchedArticle = {
                    title: 'patched title',
                    style: 'Interview',
                    content: 'patched content',
                };

                const expectedArticle = {
                    ...testArticles[idToPatch - 1],
                    ...patchedArticle
                }

                return supertest(app)
                    .patch(`/api/articles/${idToPatch}`)
                    .send(patchedArticle)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/articles/${idToPatch}`)
                            .expect(expectedArticle)
                    )
            })

            it('responds with a 400 and an error when no required fields are provided', () => {
                const articleId = 2

                return supertest(app)
                    .patch(`/api/articles/${articleId}`)
                    .send({ nonRequiredField: 'foo' })
                    .expect(400, {
                        error: `Request body must contain either 'title', 'style' or 'content'`
                    })
            })

            it('responds with a 204 and updates only the fields that were provided in the body', () => {
                const idToPatch = 2;

                const patchedArticle = {
                    title: 'patched title',
                    content: 'patched content',
                };

                const expectedArticle = {
                    ...testArticles[idToPatch - 1],
                    ...patchedArticle
                }

                return supertest(app)
                    .patch(`/api/articles/${idToPatch}`)
                    .send({
                        ...patchedArticle,
                        fieldToIgnore: 'this should not update'
                    })
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get(`/api/articles/${idToPatch}`)
                            .expect(expectedArticle)
                    )
            })
        })
    })
})