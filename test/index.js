"use strict";
const otpl = require("../lib/index");

const env={
    debug:false,
    functions:{
        test:()=>{
            return "test fn!"
        }
    }
}


otpl.config(__dirname,env)


const data={
    header:'Hello OTPL!',
    items: [
        {
            current: true,
            name: 'James',
            url: 'http://example.com'
        },
        {
            name: 'Foo1',
            url: 'http://example.com'
        },
        {
            name: 'Foo2',
            url: 'http://example.com'
        },
        {
            name: 'Foo3',
            url: 'http://example.com'
        }
    ]
}


function testDev() {
    console.log('test dev:')
    otpl.render('develop',data,(err,result)=>{
        if(err){
            throw err
        }
        console.log(result)
    })
}

function testCase() {
    console.log('test case:')
    otpl.render('case',data,(err,result)=>{
        if(err){
            throw err
        }
        console.log(result)
    })
}

let args = process.argv.splice(2);
if(args.indexOf('--dev')>-1){
    testDev();
}
else{
    testCase();
}
console.log('test end')