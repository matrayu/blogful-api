const knex = require('knex');
const app = require('./app')
const { PORT, DB_URL } = require('./config.js')

const db = knex({
  client: 'pg',
  connection: DB_URL,
})

//Using app.set('property-name', 'property-value') we can set 
//a property called 'db' and set the Knex instance as the value.
app.set('db', db)

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`)
})