/**
 * Discuz模擬登入工具
 * @module discuzLogin
 */


/**
 *  實用工具集
 *  @constant {object} utils - 實用工具集
 */
const utils = require("./utils.js");





/** Discuz模擬登入工具 */
class discuzLogin {
	
	/**
	 * 建構函式
	 * @param {string} site - 代表哪個網站
	 * @param {string} usr - 使用者帳戶名稱
	 * @param {string} pw - 使用者帳戶密碼
	 * @param {string} hostURL - 網站hostURL
	 * @param {boolean} [isCookie=true] - (可選)是否啟用cookie，默認true
	 * @param {boolean} [isRejectUnauthorized=ture] - (可選)拒絕未經驗證的證書
	*/
	constructor(site, usr, pw, hostURL , isCookie = true, isRejectUnauthorized = true){
		/** @private */
		this.site = site;
		
		/** @private */
		this.usr = usr;
		
		/** @private */
		this.pw = pw;
		
		/** @private */
		this.hostURL = hostURL;
		
		/**
		 * loginParam代表登入時所需的Object參數，初始化為{}(name: value)
		 * @private		
		*/
		this.loginParam = {};

		/** 
		 * 實用工具集，包含一些下載器等
		 * @public
		*/
		this.siteUtils = new utils(site, isCookie, isRejectUnauthorized);
		
	}
	

	
	
	/**
	 * loginPageHandler，使用自訂的函式處理登入網頁
	 * @callback loginPageHandler
	 * @param {string} body - 登入頁面回應的body
	 * @param {object} response - 登入頁面回應的response
	 * @return {object<{string, string}>} 回傳登入所需之所有參數
	*/
	
	/**
	 * getLoginPage，拿取登入網頁
	 * @async
	 * @param {object} loginParam - 登入選項
	 * @param {boolean} loginParam.isHandler - 是否要使用自訂的登入網頁處理函式
	 * @param {string} [loginParam.url] - (可選)使用特定登入網頁的URL
	 * @param {array<{name: string, value: string}>} [loginParam.customInput]- (可選)代表可以事先判斷並輸入的資料
	 * @param {string} [loginParam.formSelector] - (可選)代表使用哪個cssselector選取頁面哪個form
	 * @param {array<{selector: string, name: string, index: number}>} [loginParam.formParam] - (可選)代表要選取Form中哪些input的value，selector代表cssselector, index代表第幾個input, name代表送出表單時的name
	 * @param {array<{selector: string, name: string, index: number, prop: string, attr: string}>} [loginParam.PageParam] - (可選)代表要選取頁面中哪些資料，同上，prop代表要拿取哪個prop，attr代表要拿取哪個attr，prop和attr不能同時為空
	 * @param {loginPageHandler} [loginParam.loginPageHandler] - (可選)使用自訂的函式處理登入網頁
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	*/
	async getLoginPage(loginParam){
		try{
			//loginURL來自使用者輸入或是預設值
			let loginURL = typeof loginParam.url == "string" ? loginParam.url : `${this.hostURL}/member.php?mod=logging&action=login`;
			
			let page = await this.siteUtils.sendGetRequest(loginURL);
			let _this = this;
			
			console.log("Now processing login page...");
			
			//loginPageHandler處理登入頁面
			if(loginParam.isHandler){
				let r = loginParam.loginPageHandler(page.response, page.body);
				
				this.loginParam = r;
				
				//設定預先可以知道的資料
				if(Array.isArray(loginParam.customInput)){
					loginParam.customInput.forEach(e => {
						_this.loginParam[e.name] = e.value;
					});				
				}
			}
			else{
				//預設處理頁面
				//cheerio Object
				let $ = utils.cheerioLoad(page.body);
				
				let form;

				//如果沒有設定要選取哪個form，預設選form[name='login']
				if(typeof loginParam.formSelector == "string")
					form = $(loginParam.formSelector).eq(0);
				else
					form = $("form[name='login']").eq(0);
				
				//設定預先可以知道的資料
				if(Array.isArray(loginParam.customInput)){
					loginParam.customInput.forEach(e => {
						_this.loginParam[e.name] = e.value;
					});				
				}
				
				//預設處理需要的資料
				this.loginParam.formhash = form.find("input[name='formhash']").eq(0).attr("value");
				this.loginParam.handlekey = form.find("input[name='handlekey']").eq(0).attr("value");
				this.loginParam.referer = form.find("input[name='referer']").eq(0).attr("value");
				this.loginParam.questionid = "0";
				this.loginParam.answer = "";
				this.loginParam.cookietime = "2592000";
				
				//拿取登入API
				this.loginParam.post_action = form.attr("action");

				//自訂拿取所需要的form資料
				if(Array.isArray(loginParam.formParam)){				
					loginParam.formParam.forEach(e => {
						_this.loginParam[e.name] = form.find(e.selector).eq(e.index).attr("value");			
					});
				}
				
				//自訂拿取所需要的頁面資料
				if(Array.isArray(loginParam.PageParam)){
					loginParam.PageParam.forEach(e => {
						if(typeof e.prop == "string")
							_this.loginParam[e.name] = $(e.selector).eq(e.index).prop(e.prop);
						else if(typeof e.attr == "string")
							_this.loginParam[e.name] = $(e.selector).eq(e.index).prop(e.attr);
					});	
				}	
				
			}
			
			this.loginParam.username = this.usr;
			this.loginParam.password = this.pw;
			
			Object.keys(this.loginParam).forEach(e => {
				if(typeof _this.loginParam[e] == "undefined")
					delete _this.loginParam[e];		
			});

			
			return Promise.resolve({status: "success", message: "OK"});
		}
		catch(e){
			console.log(e);
			return Promise.resolve({
				status: "failed",
				message: "In getLoginPage methodm it is failed"
			});
		}
		
	}
	
	
		
	/**
	 * captchaHandler，使用自訂的函式處理Captcha
	 * @callback captchaHandler
	 * @async
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	*/
	
	/**
	 * getCaptha，拿取Captcha圖片
	 * @async
	 * @param {object} capthaParam - Captcha選項
	 * @param {boolean} capthaParam.isHandler - 是否要使用自訂的Captcha處理函式
	 * @param  {object} [capthaParam.headers] - (可選)要下載captcha的標頭 
	 * @param {string} [capthaParam.url] - (可選)使用特定登入網頁的URL
	 * @param {captchaHandler} [capthaParam.captchaHandler] - (可選)使用自訂的函式處理Captcha
	 * @return {{status: string, message: string}} status->代表有沒有成功拿取 message -> 訊息
	*/
	async getCaptha(capthaParam){		
		if(capthaParam.isHandler && typeof capthaParam.captchaHandler == "function") return capthaParam.captchaHandler();
		try{
			//獲取登入網頁
			let loginURL = typeof capthaParam.url == "string" ? capthaParam.url : `${this.hostURL}/member.php?mod=logging&action=login`;
			let r = await this.siteUtils.sendGetRequest(loginURL);
			
			//獲取updateseccode
			let idhash = r.body.match(/updateseccode\(.+?\)/);
			if(!idhash.length) return Promise.resolve({status: "failed", message: "In getCaptha method, cannot get idhash"});
			else idhash = idhash[0];
			idhash = idhash.match(/(\'.+?\')/)[0].replace(/\'/g, "");
			
			
			//獲取updateCode
			r = await this.siteUtils.sendGetRequest(`${this.hostURL}/misc.php?mod=seccode&action=update&idhash=${idhash}`);
			let updateCode = r.body.match(/update=[0-9]+/);
			if(!updateCode.length) return Promise.resolve({status: "failed", message: "In getCaptha method, cannot get updateCode"});
			else updateCode = updateCode[0].split("=").pop();
			
			
			if(typeof capthaParam.headers != "object")
				capthaParam.headers = {};
			
			await this.siteUtils.downloader(`${this.hostURL}/misc.php?mod=seccode&update=${updateCode}&idhash=${idhash}`, capthaParam.headers);
			
			
			return Promise.resolve({status: "success", message: "OK"});
				
		}
		catch(e){
			console.log(e);
			return Promise.resolve({status: "failed", message: "In getCaptha method, it is failed"});
		}			
	}
	
	/**
	 * postHandler，使用自訂的函式處理POST結果
	 * @callback postHandler
	 * @param {string} body POST頁面回應的body
	 * @param {object} response POST頁面回應的response
	 * @return {{status: string, message: string, result: object}} status->代表有沒有成功 message -> 訊息 result -> 可選，把處理結果傳出
	*/
	
	/**
	 * doPost，對伺服器送出POST
	 * @async
	 * @param {object} postParam - POST選項
	 * @param {postHandler} postParam.postHandler - callback處理post response 
	 * @param  {object} [postParam.headers] - (可選)要POST的標頭 
	 * @param {string} [postParam.url] - (可選)使用特定的POST API，如果沒有設定就是用this.loginParam.post_action
	 * @param {array<{name: string, value: string}>} [postParam.additionalParam] - (可選){name: value}額外的POST參數
	 * @return {postHandler} postParam.postHandler - callback處理post response 
	*/
	async doPost(postParam){		
		var _this = this;
		try{
			console.log("Try to post...");
			if(typeof postParam.headers != "object")
				postParam.headers = {};
			
			//獲取POST API
			let postApi = typeof postParam.url != "string" ? this.loginParam.post_action : postParam.url;
			
			delete this.loginParam.post_action;
			
			
			if(Array.isArray(postParam.additionalParam))
				postParam.additionalParam.forEach(e => {
					_this.loginParam[e.name] = e.value;
				});
			
			let r = await this.siteUtils.sendPostRequest(`${this.hostURL}/${postApi}`, this.loginParam, postParam.headers);
				
			return Promise.resolve(postParam.postHandler(r.body, r.response));
		}
		catch(e){
			console.log(e);
			return Promise.resolve({status: "failed", message: "In doPost method, it is failed"});
		}			
	}
	
	
	
	
}


module.exports = discuzLogin;