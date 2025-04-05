import express from "express"

const app= express();

const PORT=3000;

app.get("/",(_,res)=>{
    res.send("Hello word")
});

app.listen(PORT,()=>{
    console.log(`Server is listening at port ${PORT}`)
})

