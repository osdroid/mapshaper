/* @requires mapshaper-common, mapshaper-option-parser, mapshaper-option-validation */

// Parse an array or a string of command line tokens into an array of
// command objects.
MapShaper.parseCommands = function(tokens) {
  if (utils.isString(tokens)) {
    tokens = require('shell-quote').parse(tokens);
  }
  return MapShaper.getOptionParser().parseArgv(tokens);
};

MapShaper.getOptionParser = function() {
  // definitions of options shared by more than one command
  var targetOpt = {
        describe: "layer(s) to target (comma-sep. list); default is all layers"
      },
      nameOpt = {
        describe: "rename the edited layer(s)"
      },
      noReplaceOpt = {
        alias: "+",
        type: 'flag',
        describe: "retain the original layer(s) instead of replacing"
      },
      encodingOpt = {
        describe: "text encoding of .dbf file"
      },
      autoSnapOpt = {
        describe: "snap nearly identical points to fix minor topology errors",
        type: "flag"
      },
      snapIntervalOpt = {
        describe: "specify snapping distance in source units",
        type: "number"
      },
      sumFieldsOpt = {
        describe: "fields to sum when dissolving  (comma-sep. list)",
        type: "comma-sep"
      },
      copyFieldsOpt = {
        describe: "fields to copy when dissolving (comma-sep. list)",
        type: "comma-sep"
      },
      dissolveFieldOpt = {
        label: "<field>",
        describe: "(optional) name of a data field to dissolve on"
      };

  var parser = new CommandParser(),
      usage = "Usage\n" +
    "  mapshaper [-i] input-file(s) [input-options] [-command [options]] ...\n" +
    "  mapshaper -h [command(s)]\n" +
    "  mapshaper -encodings|version";
  parser.usage(usage);

  parser.example("Fix minor topology errors, simplify to 10%, convert to GeoJSON\n" +
      "$ mapshaper states.shp auto-snap -simplify 10% -o format=geojson");

  parser.example("Aggregate census tracts to counties\n" +
      "$ mapshaper tracts.shp -each \"CTY_FIPS=FIPS.substr(0, 5)\" -dissolve CTY_FIPS");

  parser.example("Use mapshaper -help <command> to view options for a single command");

  parser.default('i');

  parser.command('i')
    .title("Editing commands")
    .describe("input one or more files")
    .validate(validateInputOpts)
    .option("files", {
      label: "<file(s)>",
      describe: "files to import (separated by spaces), or - to use stdin"
    })
    .option("merge-files", {
      describe: "merge features from compatible files into the same layer",
      type: "flag"
    })
    .option("combine-files", {
      describe: "import files to separate layers with shared topology",
      type: "flag"
    })
    .option("no-topology", {
      describe: "treat each shape as topologically independent",
      type: "flag"
    })
    .option("precision", {
      describe: "coordinate precision in source units, e.g. 0.001",
      type: "number"
    })
    .option("auto-snap", autoSnapOpt)
    .option("snap-interval", snapIntervalOpt)
    .option("encoding", encodingOpt)
    .option("id-field", {
      describe: "import Topo/GeoJSON id property to this field"
    });

  parser.command('o')
    .describe("output edited content")
    .validate(validateOutputOpts)
    .option('_', {
      label: "<file|dir|->",
      describe: "(optional) name of output file or directory, or - for stdout"
    })
    .option("format", {
      describe: "set export format (shapefile|geojson|topojson)"
    })
    .option("target", targetOpt)
    .option("force", {
      type: "flag",
      describe: "let output files overwrite existing files"
    })
    /*
    .option("encoding", {
      describe: "text encoding of .dbf file"
    })*/

    .option("bbox-index", {
      describe: "export a .json file with bbox of each layer",
      type: 'flag'
    })
    /*
    .option("drop-table", {
      describe: "delete data attributes",
      type: "flag"
    })
    */
    .option("cut-table", {
      describe: "detach data attributes from shapes and save as a JSON file",
      type: "flag"
    })
    .option("drop-table", {
      describe: "remove data attributes from output",
      type: "flag"
    })
    .option("precision", {
      describe: "coordinate precision in source units, e.g. 0.001",
      type: "number"
    })
    .option("bbox", {
      type: "flag",
      describe: "(Topo/GeoJSON) add bbox property"
    })
    .option("prettify", {
      type: "flag",
      describe: "(Topo/GeoJSON) format output for readability"
    })
    .option("id-field", {
      describe: "(Topo/GeoJSON) field to use for id property",
      type: "comma-sep"
    })
    .option("quantization", {
      describe: "(TopoJSON) specify quantization (auto-set by default)",
      type: "integer"
    })
    .option("no-quantization", {
      describe: "(TopoJSON) export arc coordinates without quantization",
      type: "flag"
    })
    .option('presimplify', {
      describe: "(TopoJSON) add per-vertex data for dynamic simplification",
      type: "flag"
    })
    .option("topojson-precision", {
      // describe: "pct of avg segment length for rounding (0.02 is default)",
      type: "number"
    });


  parser.command('simplify')
    .validate(validateSimplifyOpts)
    .describe("simplify the geometry of polygon and polyline features")
    .option('pct', {
      alias: 'p',
      label: "<x%>",
      describe: "percentage of removable points to retain, e.g. 10%"
    })
    .option("dp", {
      alias: "rdp",
      describe: "use (Ramer-)Douglas-Peucker simplification",
      assign_to: "method"
    })
    .option("visvalingam", {
      describe: "use Visvalingam simplification with \"effective area\" metric",
      assign_to: "method"
    })
    .option("method", {
      // hidden option
    })
    .option("interval", {
      // alias: "i",
      describe: "target resolution in linear units (alternative to %)",
      type: "number"
    })
    .option("cartesian", {
      describe: "simplify decimal degree coords in 2D space (default is 3D)",
      type: "flag"
    })
    .option("keep-shapes", {
      describe: "prevent small polygon features from disappearing",
      type: "flag"
    })
    .option("no-repair", {
      describe: "don't remove intersections introduced by simplification",
      type: "flag"
    });

  parser.command("join")
    .describe("join a dbf or delimited text file to the input features")
    .validate(validateJoinOpts)
    .option("source", {
      label: "<file>",
      describe: "file containing data records"
    })
    .option("keys", {
      describe: "target,source keys, e.g. keys=FIPS,CNTYFIPS:str",
      type: "comma-sep"
    })
    .option("fields", {
      describe: "fields to join, e.g. fields=FIPS:str,POP (default is all)",
      type: "comma-sep"
    })
    .option("where", {
      describe: "use a JS expression to filter records from source table"
    })
    .option("encoding", encodingOpt)
    .option("target", targetOpt);

  parser.command("each")
    .describe("create/update/delete data fields using a JS expression")
    .validate(validateExpressionOpts)
    .option("expression", {
      label: "<expression>",
      describe: "JS expression to apply to each target feature"
    })
    .option("target", targetOpt);

   parser.command("sort")
    .describe("sort features using a JS expression")
    .validate(validateExpressionOpts)
    .option("expression", {
      label: "<expression>",
      describe: "JS expression to apply to each target feature"
    })
    .option("ascending", {
      describe: "Sort in ascending order",
      type: "flag"
    })
    .option("descending", {
      describe: "Sort in descending order",
      type: "flag"
    })
    .option("target", targetOpt);

  parser.command("filter")
    .describe("delete features using a JavaScript expression")
    .validate(validateExpressionOpts)
    .option("expression", {
      label: "<expression>",
      describe: "delete features that evaluate to false"
    })
    .option("remove-empty", {
      type: "flag",
      describe: "delete features with null geometry"
    })
    .option("keep-shapes", {
      type: "flag"
    })
    .option("target", targetOpt);

  parser.command("filter-islands")
    .describe("remove small detached polygon rings (islands)")
    .validate(validateExpressionOpts)

    .option("min-area", {
      type: "number",
      describe: "remove small-area islands (sq meters or projected units)"
    })
    .option("min-vertices", {
      type: "integer",
      describe: "remove low-vertex-count islands"
    })
    .option("remove-empty", {
      type: "flag",
      describe: "delete features with null geometry"
    })
    .option("target", targetOpt);

  parser.command("filter-fields")
    .describe('filter and rename data fields, e.g. "fips,st=state"')
    .validate(validateFilterFieldsOpts)
    .option("fields", {
      label: "<field(s)>",
      describe: "comma-sep. list of fields to retain"
    })
    .option("target", targetOpt);

  parser.command("clip")
    .describe("use a polygon layer to clip another polygon layer")
    .validate(validateClip)
    .option("source", {
      label: "<file|layer>",
      describe: "file or layer containing clip polygons"
    })
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("erase")
    .describe("use a polygon layer to erase another polygon layer")
    .validate(validateClip)
    .option("source", {
      label: "<file|layer>",
      describe: "file or layer containing erase polygons"
    })
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("dissolve")
    .validate(validateDissolveOpts)
    .describe("merge adjacent polygons")
    .option("field", dissolveFieldOpt)
    .option("sum-fields", sumFieldsOpt)
    .option("copy-fields", copyFieldsOpt)
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("dissolve2")
    .validate(validateDissolveOpts)
    // .describe("merge adjacent and overlapping polygons")
    .option("field", dissolveFieldOpt)
    .option("sum-fields", sumFieldsOpt)
    .option("copy-fields", copyFieldsOpt)
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("explode")
    .describe("separate multi-part features into single-part features")
    .option("convert-holes", {type: "flag"}) // testing
    .option("target", targetOpt);

  parser.command("innerlines")
    .describe("convert polygons to polylines along shared boundaries")
    .validate(validateInnerLinesOpts)
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("lines")
    .describe("convert polygons to classified polylines")
    .validate(validateLinesOpts)
    .option("fields", {
      label: "<field(s)>",
      describe: "optional comma-sep. list of fields to create a hierarchy",
      type: "comma-sep"
    })
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("points")
    .describe("create a point layer from data fields")
    .validate(validatePointsOpts)
    .option("x", {
      describe: "field containing x coordinate"
    })
    .option("y", {
      describe: "field containing y coordinate"
    })
    .option("inner", {
      describe: "create an interior point for each polygon's largest ring",
      type: "flag"
    })
    .option("centroid", {
      describe: "create a centroid point for each polygon's largest ring",
      type: "flag"
    })
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("split")
    .describe("split features on a data field")
    .validate(validateSplitOpts)
    .option("field", {
      label: '<field>',
      describe: "name of an attribute field"
    })
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("merge-layers")
    .describe("merge split-apart layers back into a single layer")
    .validate(validateMergeLayersOpts)
    .option("name", nameOpt)
    .option("target", targetOpt);

  parser.command("rename-layers")
    .describe("assign new names to layers (comma-sep. list)")
    .validate(validateRenameLayersOpts)
    .option("target", targetOpt);

  parser.command("subdivide")
    .describe("recursively split a layer using a JS expression")
    .validate(validateSubdivideOpts)
    .option("expression", {
      label: "<expression>",
      describe: "boolean JS expression"
    })
    // .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("split-on-grid")
    .describe("split features into separate layers according to a grid")
    .validate(validateSplitOnGridOpts)
    .option("-", {
      label: "<cols,rows>",
      describe: "size of the grid, e.g. -split-on-grid 12,10"
    })
    .option("cols", {
      type: "integer"
    })
    .option("rows", {
      type: "integer"
    })
    // .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("calc")
    .title("\nInformational commands")
    .describe("perform calculations on a data layer, print the result")
    .validate(validateExpressionOpts)
    .option("expression", {
      label: "<expression>",
      describe: "JS expression to apply to target features"
    })
    .option("where", {
      describe: "use a JS expression to select a subset of features"
    })
    .option("target", targetOpt);

  parser.command('encodings')
    .describe("print list of supported text encodings (for .dbf import)");

  parser.command('version')
    .alias('v')
    .describe("print mapshaper version");

  parser.command('info')
    .describe("print information about data layers");

  parser.command('verbose')
    .describe("print verbose processing messages");

  parser.command('help')
    .alias('h')
    .validate(validateHelpOpts)
    .describe("print help; takes optional comma-sep. list of command names")
    .option("commands");

  // trap v0.1 options
  ("f,format,p,e,expression,pct,i,visvalingam,dp,rdp,interval,merge-files,combine-files," +
  "fields,precision,auto-snap").split(',')
    .forEach(function(str) {
      parser.command(str).validate(function() {
        error(Utils.format('[%s] maphshaper syntax has changed since v0.1.x.', str));
      });
    });

  // Work-in-progress (no .describe(), so hidden from -h)
  parser.command('tracing');
  parser.command("flatten")
    .option("target", targetOpt);
  /*
  parser.command("divide")
    .option("name", nameOpt)
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("fill-holes")
    .option("no-replace", noReplaceOpt)
    .option("target", targetOpt);

  parser.command("repair")
    .option("target", targetOpt);
  */

  /*
  parser.command("filter-layers")
    .describe('filter and rename layers, e.g. "layer1=counties,layer2=1"')
    .validate(validateLayersOpts);
  */

  return parser;
};
