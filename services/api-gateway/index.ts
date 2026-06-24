import 'dotenv/config'
import app from "./src/app.js";

const PORT = process.env.PORT || 5003


app.listen(PORT, () => {
    console.log(`API-gateway is running on port ${PORT}`)
})