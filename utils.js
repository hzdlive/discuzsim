/**
 * 實用工具集
 * @module utilities
 */

var request = require("request");
var cheerio = require("cheerio");
var FileCookieStore = require("tough-cookie-file-store");
var iconv = require("iconv-lite");
var Buffer = require("buffer").Buffer;
var path = require("path");
var fs = require("fs");

/**
 *  UA標頭
 *  @constant {string} userAgent - UA標頭，默認為火狐64
 */
 const userAgent = "Mozilla/5.0 (X11; Linux i686; rv:64.0) Gecko/20100101 Firefox/64.0";
 


/** 實用工具集，包含一些爬蟲程序 */
class utilities {
	
	/**
	* 建構函式
	* @param {string} site - 代表哪個網站
	* @param {boolean} [isCookie=false] - (可選)代表是否啟用cookie
	* @param {boolean} [isRejectUnauthorized=ture] - (可選)拒絕未經驗證的證書
	*/
	
	constructor(site, isCookie = false, isRejectUnauthorized = true){	
		/** @private */
		this.site = site;
				
		/**
		 * cookieJar為cookie容器，初始為null
		 * @private
		 */
		this.cookieJar = null;
		
		 /** @private */
		this.isRejectUnauthorized = isRejectUnauthorized;
		
		//當isCookie設置為true，生成一個儲存cookie的容器
		if(isCookie){
			
			//建立存放cookie的資料夾
			if(!fs.existsSync(path.join(process.cwd(), "cookies"))){
				fs.mkdirSync(path.join(process.cwd(), "cookies"));
			}
			
			
			let jsonPath = path.join(process.cwd(), "cookies", `${site}.json`);
			
			if(!fs.existsSync(jsonPath)){
				fs.closeSync(fs.openSync(jsonPath, "w"));
			}
			
			//初始化cookieJar
			this.cookieJar = request.jar(new FileCookieStore(jsonPath));
		}
	}
	
	
	/**
     * sendGetRequest 送出get請求
     * @param  {string} url - 代表需要送request到哪個url
	 * @param  {object} [headers={}] - (可選)要送出的標頭 
	 * @param  {boolean} [isIconv=false] - (可選)送回之後用iconv進行轉換
	 * @param  {string} [encoding=utf8] - (可選)使用何種編碼
     * @return {Promise<{response: res, body: body}>} 傳回response和server回應資料，錯誤回傳錯誤的判斷
     */
	sendGetRequest(url, headers = {}, isIconv = false, encoding = "utf8"){
		
		headers["User-Agent"] = userAgent;
		
		//request設定值
		var options = {
			url: url,
			headers: headers,
			rejectUnauthorized: this.isRejectUnauthorized,
			method: "GET"
		};
		
		//設定cookie
		if(this.cookieJar !== null) 
			options.jar = this.cookieJar;
		
		//如果需要轉換，不要預設encoding
		if(isIconv)
			options.encoding = null;
		
		return new Promise((resolve, reject) => {
			request(options, (err, res, body) => {
				if(err) {
					console.log(err);
					reject(JSON.stringify({err: "In sendGetRequest method, url is " + url, message: err}))
				};
				
				if(isIconv){
					body = iconv.decode(Buffer.from(body, "binary"), encoding);				
				}
				
				resolve({
					response: res,
					body: body
				});				
			});	
		});		
	}
	
	/**
     * sendPostRequest 送出POST請求
     * @param  {string} url - 代表需要送request到哪個url
	 * @param  {object} data - 代表要送出的資料
	 * @param  {object} [headers={}] - (可選)要送出的標頭 
	 * @param  {boolean} [isIconv=false] - (可選)送回之後用iconv進行轉換
	 * @param  {string} [encoding=utf8] - (可選)使用何種編碼
     * @return {Promise<{response: res, body: body}>} 傳回response和server回應資料，錯誤回傳錯誤的判斷
     */
	sendPostRequest(url, data, headers = {}, isIconv = false, encoding = "utf8"){
		headers["User-Agent"] = userAgent;
		
		//request設定值
		var options = {
			url: url,
			headers: headers,
			rejectUnauthorized: this.isRejectUnauthorized,
			method: "POST"
		};
		
		
		//設定cookie
		if(this.cookieJar !== null) 
			options.jar = this.cookieJar;
		
		
		//設定contentType
		if(typeof headers["Content-Type"] == "undefined")
			options.headers["Content-Type"] = "application/x-www-form-urlencoded";
		
		//如果需要轉換，不要預設encoding
		if(isIconv)
			options.encoding = null;
		
		//設定資料
		if(/json/.test(options.headers["Content-Type"])) 
			options.body = JSON.stringify(data);
		else if(/x\-www\-form\-urlencoded/.test(options.headers["Content-Type"]))
			options.body = Object.keys(data).map(e => `${encodeURIComponent(e)}=${encodeURIComponent(data[e])}`).join("&");
		else
			options.body = data;
		
		return new Promise((resolve, reject) => {
			request(options, (err, res, body) => {
				if(err) {
					console.log(err);
					reject(JSON.stringify({err: "In sendPostRequest method, url is "+ url, message: err}));
				}
				if(isIconv){
					body = iconv.decode(Buffer.from(body, "binary"), encoding);				
				}
				
				resolve({
					response: res,
					body: body
				});				
			});	
		});		
	}
	
	/**
     * downloader 下載資料
	 * @param  {string} url - 要下載的URL
	 * @param  {object} [headers={}] - (可選)要送出的標頭 
     * @return {Promise<true>} 傳回true代表下載完成，錯誤回傳錯誤的判斷
     */ 
	downloader(url, headers = {}){

		headers["User-Agent"] = userAgent;
		
		//設定keep-alive標頭
		headers["Connection"] = "keep-alive";
		
		//設定Accept，預設值"image/webp,image/apng,image/*,*/*;q=0.8"
		if(!headers.hasOwnProperty("Accept"))
			headers["Accept"] = "image/webp,image/apng,image/*,*/*;q=0.8";
		
		//設定Accept-Encoding，預設值"gzip, deflate, br",
		if(!headers.hasOwnProperty("Accept-Encoding"))
			headers["Accept-Encoding"] = "gzip, deflate, br";
		
		//設定Accept-Language，預設值"zh-CN,zh;q=0.8"
		if(!headers.hasOwnProperty("Accept-Language"))
			headers["Accept-Language"] = "zh-CN,zh;q=0.8";
		
		var options = {
			url: url,
			headers: headers,
			method: "GET",
			rejectUnauthorized: this.isRejectUnauthorized
		};
		
		//設定cookie
		if(this.cookieJar !== null) 
			options.jar = this.cookieJar;
		
		let site = this.site;
		
		//建立存放圖片的資料夾
		if(!fs.existsSync(path.join(process.cwd(), "pics"))){
			fs.mkdirSync(path.join(process.cwd(), "pics"));
		}
		
		const filePath = path.join(process.cwd(), "pics", `captha_${site}.jpeg`);
		
		return new Promise((resolve, reject) => 
			request(options)
			.pipe(fs.createWriteStream(filePath))
			.on("finish", () => resolve(true))
			.on("error", () => reject(JSON.stringify({err: "In downloader method, url is "+url, message: err})))
		);
	}
	
	/**
     * getCookieJar 取得cookie容器
     * @return {Object} 傳回一個Cookie容器
     */ 
	getCookieJar(){
		return this.cookieJar;
	}
	
	/**
	 * cookieJarHandler，使用自訂callback判斷是否已登入
	 * @callback cookieJarHandler
	 * @param {Array<cookieJar>} [cookieJarArr] - cookie容器Array
	 * @return {Boolean} 回傳是否登入
	*/	
	
	/**
	 * isLogin，用cookie判斷是否已登入
	 * @param {cookieJarHandler} [cookieJarHandler] - 使用自訂callback判斷是否已登入
	 * @return {Boolean} 回傳是否登入
	*/
	isLogin(cookieJarHandler){
		var cookie = this.cookieJar;
		var isLogin = false;
		if(typeof cookie == "object" && cookie !== null){
			cookie._jar.store.getAllCookies((err, cookieArr) => {
				//出錯判斷未登入
				if(err) return
				
				//沒有cookie直接判斷未登入
				if(!cookieArr.length)
					return
				else{
					if(typeof cookieJarHandler == "function"){
						isLogin = cookieJarHandler(cookieArr);
						return;
					}
					
					//如果沒有找到帶有auth的Cookie，判斷未登入
					let authCookie = cookieArr.find(e => /auth/.test(e.toString().split(";")[0].split("=")[0]));
					if(typeof authCookie == "undefined")
						return;
					authCookie = authCookie.toString();
					//找出過期時間，過期 -> 未登入
					let expireTime = new Date(authCookie.split(";").find(e => /Expires/i.test(e)).replace(/^\s*Expires\=\s*/i, "")).getTime();
					
					if(expireTime < new Date().getTime())
						return;
					
					isLogin = true;								
				}			
			});		
		}

		return isLogin;
	}
	
	/**
     * cheerioLoad 處理html資料，包裝成cheerio
	 * @static
	 * @param  {string} body - html資料
     * @return {object} 傳回一個被cheerio包裝完的html object
     */ 
	static cheerioLoad(body){
		return cheerio.load(body);		
	}
	
	
};


module.exports = utilities;