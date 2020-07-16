/**
 * Discuz基本模擬工具
 * @module discuzSim
 */


/**
 *  實用工具集
 *  @constant {object} utils - 實用工具集
 */
const utils = require("./utils.js");

/**
 * cookieJarHandler，使用自訂callback判斷是否已登入
 * @callback cookieJarHandler
 * @param {array<cookieJar>} [cookieJarArr] - cookie容器Array
 * @return {boolean} 回傳是否登入
*/	


/** Discuz基本模擬工具 */
class discuzSim {
	
	/**
	 * 建構函式
	 * @param {string} site - 代表哪個網站
	 * @param {string} hostURL - 網站hostURL
	 * @param {boolean} [isRejectUnauthorized=ture] - (可選)拒絕未經驗證的證書
	 * @param {cookieJarHandler} [cookieJarHandler] - (可選)使用自訂Cookie判斷函式判斷是否登入
	*/
	constructor(site, hostURL, isRejectUnauthorized = true, cookieJarHandler){
		
		/** @private */
		this.site = site;
		
		/** @private */
		this.hostURL = hostURL;
				
		
		/** 
		 * 實用工具集，包含一些下載器等
		 * @public
		*/
		this.siteUtils = new utils(site, true, isRejectUnauthorized);
		
		/** 
		 * 是否登入
		 * @private
		 */
		this.isLogin = this.siteUtils.isLogin(cookieJarHandler);
	}
	
	
	/**
	 * getUserProfile，拿取使用者資訊網頁
	 * @async
	 * @param {string} [url=this.hostURL/home.php?mod=space] (可選)指定的登入頁面URL3
	 * @param {string} [encoding] (可選)指定使用的編碼
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	 */
	async getUserProfile(url, encoding){
		if(!this.isLogin)
			return Promise.resolve({
				status: "failed",
				message: "Not logged in"
			});
		
		url = url || `${this.hostURL}/home.php?mod=space`;

		try{
			let r;
			if(typeof encoding == "string")
				r = await this.siteUtils.sendGetRequest(url, {},  true, encoding);
			else
				r = await this.siteUtils.sendGetRequest(url);

			var $ = this.siteUtils.constructor.cheerioLoad(r.body);

			let mess = $("#psts li").toArray().map(e => {
				var tmp = $(e).clone();
				var title = $(e).find("em").eq(0).text();
				tmp.find("em").eq(0).empty();
				return Object.defineProperty({}, title, {
					value: tmp.text().replace(/^\s*|\s*$/g, ""),
					enumerable: true
				});
			});	
			
			
			return {
				status: "success",
				message: mess
			};
		}
		catch(e){
			console.log(e);
			return Promise.resolve({
				status: "failed",
				message: "In getUserProfile method it is failed"
			});
		}		
	}
	
	/**
	 * dailySign，每日簽到
	 * @async
	 * @param {string} url 簽到頁面URL
	 * @param {string} [encoding] (可選)指定使用的編碼
	 * @param {object<name: string, value: string>} [data] (可選)指定送出的資料
	 * @param {string} [fhURL] 包含formhash的url，默認為一開始傳進的url
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	 */
	async dailySign(url, encoding, data, fhURL){
		
		if(!this.isLogin)
			return Promise.resolve({
				status: "failed",
				message: "Not logged in"
			});
		
		try{
			let r = await this.siteUtils.sendGetRequest(typeof fhURL == "string" ? fhURL : url);
			var $ = this.siteUtils.constructor.cheerioLoad(r.body);
			
			let formhash = $("input[name='formhash']").attr("value");
			
			if(typeof data == "object" && data !== null)
				data.formhash = formhash;
			else
				data = {
					formhash: formhash,
					qdmode: "1",
					todaysay: "大家好，又是美好的一天，願上帝保佑你",
					fastreply: "0",
					qdxq: "kx"
				};
			if(typeof encoding == "string")
				r = await this.siteUtils.sendPostRequest(url, data, {},  true, encoding);
			else
				r = await this.siteUtils.sendPostRequest(url, data);
			return {
				status: "success",
				message: r.body
			};
		}
		catch(e){
			console.log(e);
			return Promise.resolve({
				status: "failed",
				message: "In getUserProfile method it is failed"
			});
		}	
	}
	
	/**
	 * dailyTasks，每日任務
	 * @async
	 * @param {string} url 任務頁面URL
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	 */
	async dailyTasks(url){
		if(!this.isLogin)
			return Promise.resolve({
				status: "failed",
				message: "Not logged in"
			});	
	}

}


module.exports = discuzSim;