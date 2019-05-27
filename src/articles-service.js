const ArticlesService = {
    //use this Knex instance to query the blogful_articles table
    getAllArticles(knex) {
        return knex.select('*').from('blogful_articles')
    },
    insertArticle(knex, newArticle) {
        return knex
            .insert(newArticle)
            .into('blogful_articles')
            //.returning() method we can specify which columns we want to select.
            .returning('*')
            //pull out the object from the array we are accessing
            //we've inserted 1 object to an empty array
            .then(rows => {
                return rows[0];
            });
    },
    getById(knex, id) {
        /* return Promise.resolve({}) */
        
        //select all articles where the id is the id passed in retriving the first record
        return knex.from('blogful_articles')
            .select('*')
            .where('id', id)
            .first()
    },
    //cleanest way to write the above - no select and calling id directly
    deleteArticle(knex, id) {
        /* return Promise.resolve({}) */
        return knex('blogful_articles')
            .where({ id })
            .delete()
    },
    updateArticles(knex, id, newArticleFields) {
        return knex('blogful_articles')
            .where({ id })
            .update(newArticleFields)
    },
}

module.exports = ArticlesService;