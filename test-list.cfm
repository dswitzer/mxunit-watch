<cfscript>
	testsDir = expandPath('/your/project/tests');
	componentPath = 'your.project.tests';

	files = createObject('mxunit.runner.DirectoryTestSuite').getTests(
		  directory=testsDir
		, componentPath=componentPath
		, recurse=true
		, excludes="/Test.*$,^_assets/"
		, precompile=false
	);
	// the results to return (we use a hashed map, so the tests are run in order)
	results = createObject("java", "java.util.LinkedHashMap").init();


	/*
	 * When generating results in batch, we only need the test suites, not the individual
	 * tests. For large code bases, this will speed up the request.
	 */
	if( structKeyExists(url, "batch") && isBoolean(url.batch) && url.batch ){
		arrayEach(files, function (file, idx){
			results[file] = [];
		});

	/*
	 * Since we are running each test individually, we need to return all the tests
	 * inside each test suite.
	 */
	} else {
		suite = createObject('mxunit.framework.TestSuite');
		// add each suite to the output
		for (i = 1; i <= arrayLen(files); i++){
			suite.addAll(files[i]);
		}

		tests = suite.suites();

		// loop through the tests and get the test methods
		iterator = tests.keySet().iterator();
		while( iterator.hasNext() ){
			suiteName = iterator.next();
			suiteMethods = tests.get(suiteName).methods;

			// sort methods alphabetically
			arraySort(suiteMethods, 'textnocase', 'asc');
			results[suiteName] = suiteMethods;
		}
	}
</cfscript>
<cfsetting showdebugoutput="false" />
<cfcontent reset="true" type="application/json; charset=UTF-8" /><cfoutput>#serializeJson(results)#</cfoutput><cfabort/>