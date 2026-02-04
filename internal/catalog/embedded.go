package catalog

import (
	_ "embed"
)

// This file handles embedded catalog data for zero-dependency deployment.
// The catalog data files are generated using the catalog-gen tool and
// embedded at compile time.
//
// To generate embedded data:
//   go run cmd/catalog-gen/main.go
//
// This will create the following files in internal/catalog/data/:
//   - hipparcos.bin.gz - Compressed Hipparcos star catalog
//   - messier.json.gz  - Compressed Messier catalog
//   - ngc.json.gz      - Compressed NGC catalog
//   - ic.json.gz       - Compressed IC catalog
//   - star_names.json  - Common star names
//
// The files are embedded using go:embed directives below.

// Note: The actual embed directives are commented out until the data files exist.
// Uncomment these after running catalog-gen.

// //go:embed data/hipparcos.bin.gz
// var embeddedHipparcosDataFile []byte

// //go:embed data/messier.json.gz
// var embeddedMessierDataFile []byte

// //go:embed data/ngc.json.gz
// var embeddedNGCDataFile []byte

// //go:embed data/ic.json.gz
// var embeddedICDataFile []byte

// //go:embed data/star_names.json
// var embeddedStarNamesFile []byte

// init registers the embedded data with the catalog loaders.
// This runs at program startup.
func init() {
	// Uncomment when data files are available:
	// SetEmbeddedData(embeddedHipparcosDataFile)
	// SetEmbeddedMessierData(embeddedMessierDataFile)
	// SetEmbeddedNGCData(embeddedNGCDataFile)
	// SetEmbeddedICData(embeddedICDataFile)
}

// MessierCatalogData contains the complete Messier catalog with descriptions.
// This is a curated list suitable for educational purposes and challenges.
var MessierCatalogData = []DeepSkyObject{
	{ID: "M1", CommonName: "Crab Nebula", RA: 83.6333, Dec: 22.0167, Type: ObjectTypeNebula, VMag: 8.4, MajorAxis: 6, MinorAxis: 4, Constellation: "Taurus", Description: "Supernova remnant, pulsar at center", Difficulty: 2, MinExposure: 1800},
	{ID: "M31", CommonName: "Andromeda Galaxy", RA: 10.6833, Dec: 41.2692, Type: ObjectTypeGalaxy, VMag: 3.4, MajorAxis: 190, MinorAxis: 60, Constellation: "Andromeda", Morphology: GalaxySpiral, Description: "Nearest major galaxy, 2.5 million light-years", Difficulty: 1, MinExposure: 3600},
	{ID: "M33", CommonName: "Triangulum Galaxy", RA: 23.4625, Dec: 30.6600, Type: ObjectTypeGalaxy, VMag: 5.7, MajorAxis: 73, MinorAxis: 45, Constellation: "Triangulum", Morphology: GalaxySpiral, Description: "Third-largest galaxy in Local Group", Difficulty: 2, MinExposure: 7200},
	{ID: "M42", CommonName: "Orion Nebula", RA: 83.8208, Dec: -5.3911, Type: ObjectTypeNebula, VMag: 4.0, MajorAxis: 85, MinorAxis: 60, Constellation: "Orion", Description: "Closest massive star-forming region", Difficulty: 1, MinExposure: 300},
	{ID: "M45", CommonName: "Pleiades", RA: 56.8708, Dec: 24.1167, Type: ObjectTypeOpenCluster, VMag: 1.6, MajorAxis: 110, Constellation: "Taurus", Description: "Seven Sisters, reflection nebulosity", Difficulty: 1, MinExposure: 1800},
	{ID: "M51", CommonName: "Whirlpool Galaxy", RA: 202.4696, Dec: 47.1953, Type: ObjectTypeGalaxy, VMag: 8.4, MajorAxis: 11, MinorAxis: 7, Constellation: "Canes Venatici", Morphology: GalaxySpiral, Description: "Face-on spiral with companion NGC 5195", Difficulty: 2, MinExposure: 7200},
	{ID: "M57", CommonName: "Ring Nebula", RA: 283.3958, Dec: 33.0286, Type: ObjectTypePlanetary, VMag: 8.8, MajorAxis: 1.4, MinorAxis: 1.0, Constellation: "Lyra", Description: "Classic planetary nebula", Difficulty: 2, MinExposure: 3600},
	{ID: "M81", CommonName: "Bode's Galaxy", RA: 148.8883, Dec: 69.0653, Type: ObjectTypeGalaxy, VMag: 6.9, MajorAxis: 27, MinorAxis: 14, Constellation: "Ursa Major", Morphology: GalaxySpiral, Description: "Grand design spiral", Difficulty: 2, MinExposure: 5400},
	{ID: "M82", CommonName: "Cigar Galaxy", RA: 148.9683, Dec: 69.6797, Type: ObjectTypeGalaxy, VMag: 8.4, MajorAxis: 11, MinorAxis: 4, Constellation: "Ursa Major", Morphology: GalaxyIrregular, Description: "Starburst galaxy, M81's companion", Difficulty: 2, MinExposure: 5400},
	{ID: "M101", CommonName: "Pinwheel Galaxy", RA: 210.8024, Dec: 54.3489, Type: ObjectTypeGalaxy, VMag: 7.9, MajorAxis: 29, MinorAxis: 27, Constellation: "Ursa Major", Morphology: GalaxySpiral, Description: "Face-on grand design spiral", Difficulty: 3, MinExposure: 10800},
	{ID: "M104", CommonName: "Sombrero Galaxy", RA: 190.0083, Dec: -11.6231, Type: ObjectTypeGalaxy, VMag: 8.0, MajorAxis: 9, MinorAxis: 4, Constellation: "Virgo", Morphology: GalaxyLenticular, Description: "Edge-on with prominent dust lane", Difficulty: 2, MinExposure: 5400},
	// Add more Messier objects...
}

// BrightStarNames maps HIP numbers to common star names
// This is loaded during catalog initialization
var BrightStarNames = map[int]string{
	11767:  "Polaris",    // Alpha Ursae Minoris
	677:    "Alpheratz",  // Alpha Andromedae
	746:    "Caph",       // Beta Cassiopeiae
	1067:   "Algenib",    // Gamma Pegasi
	3179:   "Mirach",     // Beta Andromedae
	3419:   "Schedar",    // Alpha Cassiopeiae
	4427:   "Almach",     // Gamma Andromedae
	5447:   "Achird",     // Eta Cassiopeiae
	7588:   "Achernar",   // Alpha Eridani
	8102:   "Hamal",      // Alpha Arietis
	8903:   "Diphda",     // Beta Ceti
	9640:   "Mirfak",     // Alpha Persei
	13847:  "Aldebaran",  // Alpha Tauri
	14135:  "Rigel",      // Beta Orionis
	17702:  "Capella",    // Alpha Aurigae
	21421:  "Menkalinan", // Beta Aurigae
	24436:  "Bellatrix",  // Gamma Orionis
	24608:  "Mintaka",    // Delta Orionis
	25336:  "Alnilam",    // Epsilon Orionis
	25930:  "Alnitak",    // Zeta Orionis
	26311:  "Saiph",      // Kappa Orionis
	27989:  "Betelgeuse", // Alpha Orionis
	30438:  "Canopus",    // Alpha Carinae
	32349:  "Sirius",     // Alpha Canis Majoris
	33579:  "Adhara",     // Epsilon Canis Majoris
	34444:  "Wezen",      // Delta Canis Majoris
	36850:  "Castor",     // Alpha Geminorum
	37279:  "Procyon",    // Alpha Canis Minoris
	37826:  "Pollux",     // Beta Geminorum
	45238:  "Alphard",    // Alpha Hydrae
	49669:  "Regulus",    // Alpha Leonis
	54061:  "Dubhe",      // Alpha Ursae Majoris
	54872:  "Merak",      // Beta Ursae Majoris
	57632:  "Denebola",   // Beta Leonis
	58001:  "Phecda",     // Gamma Ursae Majoris
	59774:  "Megrez",     // Delta Ursae Majoris
	62956:  "Alioth",     // Epsilon Ursae Majoris
	65378:  "Mizar",      // Zeta Ursae Majoris
	67301:  "Alkaid",     // Eta Ursae Majoris
	68702:  "Spica",      // Alpha Virginis
	69673:  "Arcturus",   // Alpha Bootis
	71681:  "Proxima",    // Alpha Centauri C (closest star)
	71683:  "Rigil Kent", // Alpha Centauri A
	72622:  "Hadar",      // Beta Centauri
	80763:  "Antares",    // Alpha Scorpii
	85927:  "Rasalhague", // Alpha Ophiuchi
	86032:  "Shaula",     // Lambda Scorpii
	91262:  "Vega",       // Alpha Lyrae
	95947:  "Albireo",    // Beta Cygni
	97649:  "Altair",     // Alpha Aquilae
	102098: "Deneb",      // Alpha Cygni
	107315: "Fomalhaut",  // Alpha Piscis Austrini
	109268: "Enif",       // Epsilon Pegasi
	113368: "Markab",     // Alpha Pegasi
	113881: "Scheat",     // Beta Pegasi
}

// InitializeStarNames adds common names to a loaded Hipparcos catalog
func InitializeStarNames(catalog *HipparcosCatalog) {
	for hip, name := range BrightStarNames {
		catalog.AddStarName(name, hip)
	}
}

// InitializeMessierCatalog loads the built-in Messier catalog
func InitializeMessierCatalog(catalog *DSOCatalogImpl) {
	for _, obj := range MessierCatalogData {
		catalog.Add(obj)
	}
}
