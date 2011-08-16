var soda = require('soda');

var prefix   = 'css=.text-core > .text-wrap > ',
	focus    = prefix + '.text-focus',
	textarea = prefix + 'textarea',
	dropdown = prefix + '.text-dropdown',
	prompt   = prefix + '.text-prompt'
	;

var DOWN  = '\\40',
	UP    = '\\38',
	ESC   = '\\27',
	ENTER = '\\13'
	;

function log(cmd, args)
{
	args = Array.prototype.slice.apply(arguments);
	cmd  = args.shift();
	console.log(' \x1b[33m%s\x1b[0m%s', cmd, args.length > 0 ? ': ' + args.join(', ') : '');
};

function echo(msg)
{
	log('echo', msg);
};

function verifyTextExt(browser)
{
	browser.assertElementPresent(textarea);
};

function keyPress(charCode)
{
	return function(browser)
	{
		browser
			.keyDown(textarea, '\\' + charCode)
			.keyUp(textarea, '\\' + charCode)
			;
	};
};

function backspace(browser)
{
	browser.and(keyPress(8));
};
	
function tagXPath(value)
{
	return '//div[contains(@class, "text-core")]//div[contains(@class, "text-tags")]//span[text()="' + value + '"]/../..';
};

function suggestionsXPath(selected, index)
{
	index    = index != null ? '[' + (index + 1) + ']' : '';
	selected = selected == true ? '[contains(@class, "text-selected")]' : '';

	return '//div[contains(@class, "text-core")]//div[contains(@class, "text-dropdown")]//div[contains(@class, "text-suggestion")]' + index + selected;
};

function assertSuggestionItem(test)
{
	return function(browser) { browser.assertVisible(suggestionsXPath() + '//span[text()="Basic"]') };
};

function assertOutput(value)
{
	// @TODO add actual value check
	return function(browser) { browser.assertElementPresent('//textarea[@id="output"]') };
};

function assertTagPresent(value)
{
	return function(browser) { browser.assertElementPresent(tagXPath(value)) };
};

function assertTagNotPresent(value)
{
	return function(browser) { browser.assertElementNotPresent(tagXPath(value)) };
};

function enterKey(browser)
{
	browser
		.keyDown(textarea, '\\13')
		.keyUp(textarea, '\\13')
		;
};

function typeTag(value)
{
	return function(browser)
	{
		browser
			.type(textarea, '')
			.typeKeys(textarea, value)
			.and(enterKey)
			;
	};
};

function focusInput(browser)
{
	browser.fireEvent(textarea, 'focus');
};

function defaultWrap(value)
{
	return value;
};

function typeAndValidateTag(value, wrap)
{
	wrap = wrap || defaultWrap;
	return function(browser)
	{
		browser
			.and(typeTag(value))
			.and(assertTagPresent(wrap(value)))
			;
	};
};

function closeTag(value, wrap)
{
	wrap = wrap || defaultWrap;
	return function(browser)
	{
		browser
			.click(tagXPath(wrap(value)) + '//a[@class="text-remove"]')
			.and(assertTagNotPresent(wrap(value)))
			;
	};
};

function screenshot(name)
{
	return function(browser)
	{
		// browser.captureEntirePageScreenshot(__dirname + '/' + name + ' (' + (new Date().toUTCString().replace(/:/g, '.')) + ').png');
	};
};

function createBrowser()
{
	return soda.createClient({
		host    : 'localhost',
		port    : 4444,
		url     : 'http://localhost:4000',
		browser : 'firefox'
	});
};

function testAjaxFunctionality()
{
	return function(browser)
	{
		browser
			.and(focusInput)
			.typeKeys(textarea, 'ba')
			.waitForVisible(dropdown)
			.and(assertSuggestionItem('Basic'))
			;
	}
};

function testFilterFunctionality()
{
	return function(browser)
	{
		browser
			.and(focusInput)

			.and(typeTag('hello'))
			.and(assertTagNotPresent('hello'))
			.and(typeTag('world'))
			.and(assertTagNotPresent('world'))

			.and(typeAndValidateTag('PHP'))
			.and(typeAndValidateTag('Ruby'))
			.and(typeAndValidateTag('Go'))
			;
	};
};

function testTagFunctionality(wrap)
{
	return function(browser)
	{
		browser
			.and(focusInput)

			.and(typeAndValidateTag('hello', wrap))
			.and(assertOutput('["hello"]'))
			.and(typeAndValidateTag('world', wrap))
			.and(assertOutput('["hello","world"]'))
			.and(typeAndValidateTag('word1', wrap))
			.and(assertOutput('["hello","world","word1"]'))
			.and(typeAndValidateTag('word2', wrap))
			.and(assertOutput('["hello","world","word1","word2"]'))
			.and(typeAndValidateTag('word3', wrap))
			.and(assertOutput('["hello","world","word1","word2","word3"]'))

			.and(closeTag('word2', wrap))
			.and(assertOutput('["hello","world","word1","word3"]'))
			.and(closeTag('word1', wrap))
			.and(assertOutput('["hello","world","word3"]'))
			.and(closeTag('word3', wrap))
			.and(assertOutput('["hello","world"]'))

			// backspace
			.and(backspace)
			.and(assertTagNotPresent('world'))
			;
	};
};

function testPromptFunctionality(secondary)
{
	return function(browser)
	{
		browser
			.assertVisible(prompt)
			.and(focusInput)
			.and(secondary)
			.assertNotVisible(prompt)
			;
	};
};

function testAutocompleteFunctionality(finalAssert)
{
	finalAssert = finalAssert || function(browser)
	{
		browser.assertValue(textarea, 'OCAML');
	};
 
	return function(browser)
	{
		browser
			.click(textarea)
			
			// activate the dropdown
			.keyDown(textarea, DOWN)
			.assertVisible(dropdown)
			.assertVisible(suggestionsXPath(true, 0))

			// go to the second item
			.keyDown(textarea, DOWN)
			.assertElementNotPresent(suggestionsXPath(true, 0))
			.assertVisible(suggestionsXPath(true, 1))

			// go to the third item
			.keyDown(textarea, DOWN)
			.assertElementNotPresent(suggestionsXPath(true, 1))
			.assertVisible(suggestionsXPath(true, 2))

			// go back up to the second item
			.keyDown(textarea, UP)
			.assertElementNotPresent(suggestionsXPath(true, 2))
			.assertVisible(suggestionsXPath(true, 1))

			// go back up to the first item
			.keyDown(textarea, UP)
			.assertElementNotPresent(suggestionsXPath(true, 1))
			.assertVisible(suggestionsXPath(true, 0))

			.typeKeys(textarea, 'oca')
			.assertVisible(suggestionsXPath(true, 0))
			.keyDown(textarea, ENTER)
			.assertNotVisible(dropdown)

			.and(finalAssert)
			;
	};
};

function testPlainInputFunctionality()
{
	return function(browser)
	{
		browser
			.typeKeys(textarea, 'Hello world')
			.and(assertOutput('"Hello world"'))
			;
	};
};

function runModule(run)
{
	var browser = createBrowser();

	browser.on('command', log);

	browser.chain.session()
		.windowMaximize()
		.and(run)
		.testComplete()
		.end(function(err)
		{
			if (err) throw err;
			echo('ALL DONE');
		})
	;
};

module.exports = {
	log                           : log,
	echo                          : echo,
	focusInput                    : focusInput,
	backspace                     : backspace,
	keyPress                      : keyPress,
	verifyTextExt                 : verifyTextExt,
	tagXPath                      : tagXPath,
	suggestionsXPath              : suggestionsXPath,
	assertTagPresent              : assertTagPresent,
	assertTagNotPresent           : assertTagNotPresent,
	assertOutput                  : assertOutput,
	assertSuggestionItem          : assertSuggestionItem,
	typeTag                       : typeTag,
	typeAndValidateTag            : typeAndValidateTag,
	enterKey                      : enterKey,
	closeTag                      : closeTag,
	screenshot                    : screenshot,
	createBrowser                 : createBrowser,
	runModule                     : runModule,
	testFilterFunctionality       : testFilterFunctionality,
	testTagFunctionality          : testTagFunctionality,
	testPromptFunctionality       : testPromptFunctionality,
	testAutocompleteFunctionality : testAutocompleteFunctionality,
	testPlainInputFunctionality   : testPlainInputFunctionality,
	testAjaxFunctionality         : testAjaxFunctionality,

	css : {
		focus    : focus,
		textarea : textarea,
		dropdown : dropdown
	}
};

