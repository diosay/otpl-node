/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import Env from './env';
import Loader from './loader';
import {Compiler} from './compiler';
import Interpreter from './interpreter';
import GetBuiltinFunc from './builtin-func';
import * as fs from "fs"
import * as path from "path"
import * as utils from './utils';

/**
 * ContextScope
 */
class ContextScope {
    private stack: Array<any> = new Array()
    private locals: Map<string, any> = new Map()
    constructor(data: any, parent: ContextScope) {
        if (parent) {
            for (let item of parent.locals) {
                this.locals.set(item[0], item[1]);
            }
        }
        else {
            for (let key in data) {
                this.locals.set((key + '').toLowerCase(), data[key]);
            }
        }
    }
    pop() {
        return this.stack.pop();
    }
    push(value: any) {
        this.stack.push(value === undefined ? null : value);
    }
    get(name: string) {
        return this.locals.get(name);
    }
    set(name: string, value: any) {
        this.locals.set(name, value === undefined ? null : value);
    }
}


/**
 * 表示一个运行时上下文
 */
export default class Context {

    env: Env
    compiler: Compiler
    interpreter: Interpreter
    data: any
    private output: string
    private loaders: Map<string, Loader> = new Map()
    private scopes: ContextScope[] = []
    private current: ContextScope

    constructor(env: Env, compiler: Compiler, interpreter: Interpreter, data: any) {
        this.env = env;
        this.compiler = compiler;
        this.interpreter = interpreter;
        this.data = data;
        this.scope(); //初始化作用域
    }

    /**
     * 从栈中弹出一个元素
     */
    pop(): any {
        return this.current.pop();
    }
    /**
     * 向栈中压入一个元素
     */
    push(value: any) {
        this.current.push(value);
    }

    /**
     * 设置本地变量
     */
    setLocal(name: string, value: any) {
        this.current.set((name + '').trim().toLowerCase(), value);
    }

    /**
     * 获取本地变量
     */
    getLocal(name: string): any {
        name = (name + '').trim().toLowerCase();
        if (name == 'viewdata') {
            return this.data;
        }
        return this.current.get(name);
    }

    /**
     * 创建一个新的作用域
     */
    scope(): Context {
        if (this.current) {
            this.scopes.push(this.current);
        }

        this.current = new ContextScope(this.data, this.current);
        return this;
    }
    /**
     * 移除一个作用域
     */
    unscope(): Context {
        this.current = this.scopes.pop();
        return this;
    }

    // /**
    //  * 获取一个载入器
    //  */
    // getLoader(src: string, ref: string): Loader {
    //     var id = src + (ref || '');
    //     var loader = this.loaders.get(id);
    //     if (loader) {
    //         return loader;
    //     }

    //     var uid = utils.md5(src);
    //     var dst = path.join(this.env.targetPath, uid + '.otc');
    //     if (this.env.debug) {//如果是调试模式，则始终重新编译
    //         //this.compiler.compile(src, dst);
    //     }
    //     loader = Loader.open(dst, this.env);
    //     if (!loader || (loader && !loader.isValid())) {
    //         if (loader) {
    //             loader.close();
    //         }
    //         //this.compiler.compile(src, dst);
    //         loader = Loader.open(dst, this.env);
    //     }
    //     if (loader) {
    //         this.loaders.set(id, loader);
    //     }
    //     return loader;
    // }

    /**
     * 将一个结果打印到输出。
     */
    print(value: any, escape: boolean) {
        value = (value === undefined || value === null ? '' : value) + ''; //转换成字符串
        //TODO:escape
        this.output = this.result + value;
    }

    /**
     * 获取渲染后结果
     */
    get result(): string {
        return this.output || '';
    }

    /**
     * 
     */
    destory() {
        this.compiler = null;
        this.interpreter = null;
        this.env = null;
        this.data = null;
        this.scopes = null;
        this.current = null;
        // for (var entry of this.loaders) {
        //     if (entry[1]) {
        //         entry[1].close();
        //     }
        // }
        this.loaders.clear();
    }

    /**
     * 获取定义的函数
     */
    GetFunc(fnName: string): Function {
        let fn = GetBuiltinFunc(fnName);
        if (!fn) {
            fn = this.env.functions[fnName];
        }
        return fn;
    }

    exist(file: string, exts: string[]) {
        for (let ext of exts) {
            if (file.endsWith(ext)) {
                return ext;
            }
        }
    }

    // resolve(file: string, base: string, callback: (err: NodeJS.ErrnoException, result: any, stats: fs.Stats) => void) {
    //     let me = this
    //     let urls = function* () {

    //         let fixed = false
    //         if (file.startsWith("~")) {
    //             fixed = true
    //             file = path.normalize(file.substr(1))
    //         }

    //         //let exts = ["otpl", "otpl.html", "html"]
    //         //let root = me.env.soruceDir

    //         if (!fixed) {
    //             let ext = me.exist(file, me.env.extensions)
    //             if (ext) {
    //                 file = path.normalize(path.join(file))
    //                 yield { file: file.substr(0, file.length - ext.length - 1), ext: ext, root: me.env.soruceDir }
    //             }
    //             else {
    //                 for (let ext of me.env.extensions) {
    //                     yield { file: path.normalize(path.join(file)), ext: ext, root: me.env.soruceDir }
    //                 }
    //             }
    //         }
    //         else {
    //             for (let ext of me.env.extensions) {
    //                 if (file.endsWith(ext)) {
    //                     yield { file: file, ext: ext, root: "" }
    //                 }
    //             }
    //         }
    //     }

    //     let itor = urls()
    //     let next: Function
    //     next = () => {
    //         let stat = itor.next()
    //         if (!stat.done) {
    //             fs.stat(path.join(stat.value.root, stat.value.file + stat.value.ext), (err, stats) => {
    //                 if (err) {
    //                     // console.log(stat.value)
    //                     // console.log(err)
    //                     next()
    //                     return
    //                 }
    //                 else if (!stats.isFile()) {
    //                     next()
    //                     return
    //                 }
    //                 callback(null, stat.value, stats)
    //             })
    //         }
    //         else {
    //             callback(new Error("not match:" + file), null, null)
    //         }
    //     }
    //     next()
    // }

    exec(file: string, callback: (err: NodeJS.ErrnoException, rendered: string) => void) {

        this.load(file, "", (err, loader) => {
            if (err) {
                return callback(err, null)
            }
            this.interpreter.exec(loader, this, 0, (err) => {
                if (err) {
                    return callback(err, null)
                }
                callback(err, this.output)
            })
        })

    }

    // load2(file: string, ref: string, callback: (err: NodeJS.ErrnoException, loader: Loader) => any) {

    //     this.resolve(file, ref, (err, src, stats) => {
    //         if (err) {
    //             callback(err, null)
    //         }
    //         else {
    //             let id = utils.md5(src.file)
    //             let loader = this.loaders.get(id)
    //             if (loader && !this.env.debug) {
    //                 return callback(null, loader)
    //             }

    //             let target = path.join(this.env.targetDir, id + ".otc")
    //             Loader.open(target, this.env, (err, loader) => {
    //                 if (err || this.env.debug) {
    //                     this.compiler.compile(src, stats, target, (err, target) => {
    //                         if (err) {
    //                             return callback(err, null)
    //                         }
    //                         Loader.open(target, this.env, (err, loader) => {
    //                             if (err) {
    //                                 return callback(err, null)
    //                             }
    //                             this.loaders.set(id, loader)
    //                             callback(err, loader)
    //                         })
    //                     })
    //                 }
    //                 else {
    //                     this.loaders.set(id, loader)
    //                     callback(err, loader)
    //                 }
    //             })
    //         }
    //     })

    // }

    resolve(file: string, ext: string, callback: (err: NodeJS.ErrnoException, result: { file: string, ext: string, root: string }, stats: fs.Stats) => void) {
        let me = this
        let urls = function* () {
            if (ext && ext != "") {
                yield { file: file, ext: ext, root: me.env.soruceDir }
            }
            else {
                for (let ext of me.env.extensions) {
                    yield { file: file, ext: ext, root: me.env.soruceDir }
                }
            }
        }

        let itor = urls()
        let next: Function
        next = () => {
            let stat = itor.next()
            if (!stat.done) {
                fs.stat(path.join(stat.value.root, stat.value.file + stat.value.ext), (err, stats) => {
                    if (err) {
                        // console.log(stat.value)
                        // console.log(err)
                        next()
                        return
                    }
                    else if (!stats.isFile()) {
                        next()
                        return
                    }
                    callback(null, stat.value, stats)
                })
            }
            else {
                callback(new Error("not match:" + file), null, null)
            }
        }
        next()
    }

    load(name: string, ref: string, callback: (err: NodeJS.ErrnoException, loader: Loader) => void) {
        let normal = this.normalize(name, ref, this.env.extensions)

        let id = utils.md5(normal.name)
        let loader = this.loaders.get(id)
        if (loader) {
            return callback(null, loader)
        }

        let compile = () => {
            this.resolve(normal.name, normal.ext, (err, src, stats) => {
                if (err) {
                    return callback(err, null)
                }
                this.compiler.compile(src, stats, target, (err, target) => {
                    if (err) {
                        return callback(err, null)
                    }
                    Loader.open(target, this.env, (err, loader) => {
                        if (err) {
                            return callback(err, null)
                        }
                        this.loaders.set(id, loader)
                        callback(err, loader)
                    })
                })
            })
        }
        let target = path.join(this.env.targetDir, id + ".otc")
        Loader.open(target, this.env, (err, loader) => {
            if (err || this.env.debug) {
                compile()
            }
            else {
                fs.stat(path.join(this.env.soruceDir, loader.src), (err, stats) => {
                    if (err || loader.mtime == stats.mtime.getTime()) {
                        this.loaders.set(id, loader)
                        return callback(null, loader)
                    }
                    compile()
                })
            }
        })

    }

    normalize(name: string, ref: string, exts: string[]) {
        let ext = this.exist(name, exts)
        name = path.normalize(path.join("", name)).replace('\\', '/')
        let result = { name: ext ? name.substr(0, name.length - ext.length - 1) : name, ext: ext }
        if (!result.name.startsWith('/')) {
            result.name = '/' + result.name
        }
        return result
    }

}