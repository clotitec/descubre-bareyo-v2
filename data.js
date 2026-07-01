// ==================== CONFIG ====================
const CONFIG = {
    center: [-3.5938, 43.4735],
    zoom: 13,
    minZoom: 11,
    maxZoom: 19,
    boundaryColor: '#1A4D2E',
    pitch: 35,
    bearing: -10
};

// ==================== TABS ====================
const TABS = [
    { id: 'all',    label: 'Todo',       emoji: '🗺️', color: '#1A4D2E' },
    { id: 'hiking', label: 'Rutas',      emoji: '🥾', color: '#EA580C' },
    { id: 'costa',  label: 'Patrimonio', emoji: '⛪', color: '#0369A1' },
    { id: 'biz',    label: 'Negocios',   emoji: '📍', color: '#6366F1' },
    { id: '3d',     label: '3D',         emoji: '🧊', color: '#15803D' }
];

// ==================== ROUTE COLORS ====================
const ROUTE_COLORS = {
    'bareyo-1': { main: '#EA580C', glow: '#F97316', name: 'Naranja' },
    'bareyo-2': { main: '#0369A1', glow: '#0EA5E9', name: 'Azul Oceano' },
    'bareyo-3': { main: '#059669', glow: '#10B981', name: 'Verde Bosque' },
    'bareyo-4': { main: '#7C3AED', glow: '#A78BFA', name: 'Purpura' },
    'bareyo-5': { main: '#DC2626', glow: '#EF4444', name: 'Rojo' },
    'bareyo-6': { main: '#0891B2', glow: '#22D3EE', name: 'Cian' }
};

// ==================== HIKING ROUTES ====================
const hikingRoutes = [
    {
        id: 'bareyo-1', name: 'San Pedruco y Cabo Quintres', km: '9.8', time: '2h 30m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-1'], routeNumber: 1,
        desc: 'Recorre destacados puntos historicos y naturales como la Ermita de San Pedruco, el espectacular Cabo Quintres y varias casonas blasonadas del municipio.',
        location: 'Ajo, Bareyo',
        coords: [[-3.61232,43.4793,46],[-3.61263,43.4825,40],[-3.61296,43.4843,43],[-3.61409,43.4854,46],[-3.61626,43.4872,40],[-3.61903,43.4894,31],[-3.61936,43.4919,6],[-3.62292,43.4932,28],[-3.62566,43.4916,25],[-3.62647,43.489,26],[-3.62939,43.4893,61],[-3.63385,43.488,84],[-3.63808,43.4888,118],[-3.64119,43.489,147],[-3.64026,43.4921,141],[-3.64187,43.4958,130],[-3.64029,43.4921,141],[-3.64139,43.4889,146],[-3.63784,43.4888,114],[-3.63346,43.4873,86],[-3.63218,43.4852,50],[-3.63171,43.482,38],[-3.62766,43.4815,58],[-3.62333,43.4819,68],[-3.6201,43.4825,64],[-3.61681,43.483,49],[-3.61356,43.4814,42],[-3.61228,43.4792,46]],
        tags: ['Acantilados', 'Patrimonio', 'Vistas'],
        gpxUrl: 'assets/tracks/san_pedruco.gpx'
    },
    {
        id: 'bareyo-2', name: 'Cabo y Ria de Ajo', km: '13.7', time: '3h 30m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-2'], routeNumber: 2,
        desc: 'Recorrido costero esencial que visita el emblematico Faro de Ajo, la sorprendente Cueva de la Ojerada y la Ria de Ajo.',
        location: 'Bareyo',
        coords: [[-3.61231,43.4793,46],[-3.6083,43.4812,47],[-3.60572,43.484,42],[-3.60379,43.4867,42],[-3.59973,43.4882,42],[-3.59908,43.4906,49],[-3.59691,43.4932,44],[-3.59745,43.497,45],[-3.59749,43.5007,48],[-3.59551,43.5042,55],[-3.59451,43.5075,62],[-3.59641,43.5084,65],[-3.59598,43.5076,66],[-3.59327,43.5074,58],[-3.58936,43.509,56],[-3.5851,43.5112,42],[-3.58319,43.5118,35],[-3.58749,43.5094,46],[-3.589,43.5081,52],[-3.58425,43.5078,53],[-3.58353,43.5053,27],[-3.58399,43.5045,21],[-3.58734,43.5024,8],[-3.58814,43.5003,13],[-3.58842,43.4976,16],[-3.59077,43.4951,20],[-3.59252,43.4925,32],[-3.59444,43.4896,38],[-3.59788,43.4881,31],[-3.6002,43.4855,24],[-3.59779,43.483,15],[-3.59852,43.48,17],[-3.60163,43.4792,27],[-3.60627,43.4804,40],[-3.61081,43.4801,39],[-3.61246,43.4791,46]],
        tags: ['Faro', 'Costa', 'Ojerada'],
        gpxUrl: 'assets/tracks/cabo_ria_ajo.gpx'
    },
    {
        id: 'bareyo-3', name: 'Sta. Maria de Bareyo y San Roque', km: '9.6', time: '2h 30m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-3'], routeNumber: 3,
        desc: 'Ruta de patrimonio que incluye la Iglesia Santa Maria de Bareyo (joya del romanico), el Molino de la Venera y la Ermita de San Roque.',
        location: 'Bareyo',
        coords: [[-3.61229,43.4793,45],[-3.60944,43.4804,44],[-3.60575,43.4803,44],[-3.60255,43.4797,39],[-3.59928,43.4794,27],[-3.59842,43.477,21],[-3.59794,43.4744,24],[-3.5952,43.4735,34],[-3.59497,43.4716,55],[-3.59493,43.4695,56],[-3.5965,43.4675,63],[-3.59469,43.4658,52],[-3.5917,43.4657,31],[-3.58822,43.4661,12],[-3.58765,43.4661,12],[-3.59119,43.466,31],[-3.59393,43.4654,41],[-3.59638,43.4663,59],[-3.5992,43.4659,56],[-3.60066,43.4672,81],[-3.6037,43.4666,95],[-3.60696,43.4658,108],[-3.60843,43.4639,110],[-3.61171,43.4643,124],[-3.61474,43.4657,134],[-3.61584,43.4682,157],[-3.61854,43.4697,157],[-3.62034,43.4708,149],[-3.622,43.4729,121],[-3.61902,43.4731,101],[-3.6186,43.4751,78],[-3.61974,43.4774,78],[-3.61816,43.4792,63],[-3.61549,43.4794,47],[-3.61239,43.4792,46]],
        tags: ['Romanico', 'Molino', 'Historia'],
        gpxUrl: 'assets/tracks/santa_maria.gpx'
    },
    {
        id: 'bareyo-4', name: 'Iglesia de San Vicente y San Julian', km: '6.9', time: '1h 45m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-4'], routeNumber: 4,
        desc: 'Ruta jacobea que pasa por la Iglesia de San Vicente Martir, el Palacio de Guemes y el Hospital de peregrinos de San Julian.',
        location: 'Bareyo',
        coords: [[-3.6369,43.4557,66],[-3.63411,43.4564,56],[-3.6314,43.4572,42],[-3.62909,43.4586,45],[-3.62621,43.4595,48],[-3.62346,43.4601,56],[-3.62083,43.4593,56],[-3.61815,43.4583,59],[-3.61774,43.4562,53],[-3.62096,43.4557,41],[-3.62299,43.455,43],[-3.6233,43.4529,32],[-3.62379,43.4509,30],[-3.62481,43.4491,43],[-3.62689,43.4473,32],[-3.62982,43.4482,40],[-3.63266,43.4492,37],[-3.63566,43.4494,38],[-3.63873,43.4492,49],[-3.64181,43.449,65],[-3.6445,43.4478,70],[-3.64567,43.446,88],[-3.64532,43.4477,88],[-3.64493,43.4494,70],[-3.64525,43.4514,56],[-3.64332,43.4532,67],[-3.64132,43.4549,69],[-3.63788,43.4557,66],[-3.63702,43.4557,66]],
        tags: ['Camino de Santiago', 'Palacio', 'Patrimonio'],
        gpxUrl: 'assets/tracks/san_vicente.gpx'
    },
    {
        id: 'bareyo-5', name: 'Ruta de las Iglesias', km: '11.2', time: '2h 45m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-5'], routeNumber: 5,
        desc: 'Completo itinerario monumental que conecta el Palacio de Cubillas, las iglesias de San Vicente, Santa Maria de Bareyo y San Martin de Tours.',
        location: 'Bareyo',
        coords: [[-3.61276,43.4791,46],[-3.61409,43.4773,41],[-3.61617,43.4762,57],[-3.61813,43.4755,74],[-3.61909,43.4733,99],[-3.62203,43.4731,110],[-3.62035,43.4714,139],[-3.62075,43.4695,143],[-3.62239,43.4674,138],[-3.62383,43.4651,120],[-3.6259,43.4635,103],[-3.62782,43.4645,88],[-3.62834,43.4623,72],[-3.62827,43.4596,55],[-3.63084,43.4578,45],[-3.63366,43.4566,54],[-3.63684,43.4558,62],[-3.63413,43.4563,62],[-3.63108,43.4575,45],[-3.62807,43.459,39],[-3.62533,43.4601,56],[-3.62188,43.4596,54],[-3.61868,43.4586,61],[-3.61687,43.4594,57],[-3.61618,43.4602,78],[-3.61338,43.462,102],[-3.61094,43.4636,117],[-3.60742,43.4646,110],[-3.60593,43.4661,110],[-3.60266,43.4671,100],[-3.59974,43.4682,88],[-3.59668,43.4698,78],[-3.59511,43.4718,54],[-3.59525,43.4735,41],[-3.59801,43.4748,23],[-3.59847,43.4774,18],[-3.59944,43.4794,28],[-3.60257,43.4798,30],[-3.60638,43.4804,41],[-3.61017,43.4804,45],[-3.61254,43.4791,46],[-3.61254,43.4791,46]],
        tags: ['Monumental', 'Iglesias', 'Arquitectura'],
        gpxUrl: 'assets/tracks/ruta_iglesias.gpx'
    },
    {
        id: 'bareyo-6', name: 'Ruta de los Monumentos', km: '7.3', time: '1h 50m', diff: 'easy', type: 'circular',
        color: ROUTE_COLORS['bareyo-6'], routeNumber: 6,
        desc: 'Itinerario patrimonial por el casco de Bareyo: casonas blasonadas, torres y conventos como la Casa Solar y Torre de Cubillas, las casonas de Villanueva del Castillo, de Cubillas, de la Peña y de la Maza, y el Convento de San Ildefonso.',
        location: 'Bareyo',
        coords: [[-3.61108,43.47582,45],[-3.61113,43.47584,45],[-3.61159,43.47604,44],[-3.61184,43.47613,43],[-3.61206,43.47618,43],[-3.61215,43.47619,43],[-3.61221,43.47619,42],[-3.61235,43.47619,42],[-3.61244,43.47618,42],[-3.6125,43.47617,42],[-3.61269,43.47615,43],[-3.61292,43.47611,43],[-3.61292,43.47616,43],[-3.61292,43.47617,43],[-3.61293,43.47622,43],[-3.61302,43.47632,43],[-3.61325,43.47683,41],[-3.6133,43.47694,41],[-3.61332,43.47708,41],[-3.61332,43.4771,41],[-3.61332,43.47708,41],[-3.61336,43.47709,41],[-3.61337,43.4772,41],[-3.61337,43.47744,40],[-3.6134,43.47749,40],[-3.61342,43.47781,42],[-3.61339,43.47819,44],[-3.61332,43.47836,45],[-3.61328,43.47841,45],[-3.61299,43.47873,46],[-3.61294,43.4787,46],[-3.61279,43.47881,46],[-3.61264,43.47888,47],[-3.61261,43.47889,47],[-3.61255,43.47886,47],[-3.61224,43.47873,45],[-3.61197,43.47865,44],[-3.61184,43.47862,44],[-3.61178,43.47863,43],[-3.61176,43.47864,43],[-3.61192,43.47895,45],[-3.61194,43.47906,46],[-3.61191,43.47919,46],[-3.61192,43.4792,46],[-3.61203,43.47922,46],[-3.61207,43.47924,46],[-3.61203,43.47922,46],[-3.61199,43.47949,47],[-3.61197,43.47951,47],[-3.61196,43.47955,47],[-3.61199,43.47963,47],[-3.61195,43.47963,47],[-3.61204,43.48011,47],[-3.61209,43.48011,47],[-3.61212,43.48024,46],[-3.61213,43.48032,46],[-3.61219,43.48067,45],[-3.61228,43.48109,45],[-3.61235,43.4811,45],[-3.61235,43.4811,45],[-3.61235,43.4811,45],[-3.6124,43.48111,44],[-3.61272,43.48118,44],[-3.61316,43.48128,43],[-3.61401,43.48155,41],[-3.61456,43.4818,39],[-3.6147,43.4819,39],[-3.61483,43.48195,39],[-3.61489,43.48196,39],[-3.61498,43.48197,39],[-3.61512,43.48196,39],[-3.61532,43.48191,40],[-3.61583,43.48174,41],[-3.61718,43.48138,46],[-3.61724,43.48137,46],[-3.61738,43.48135,47],[-3.61756,43.48134,48],[-3.61788,43.48138,49],[-3.61801,43.4814,50],[-3.61818,43.48138,51],[-3.61826,43.48139,52],[-3.61834,43.48143,52],[-3.61832,43.48137,52],[-3.61834,43.48143,52],[-3.61847,43.48158,54],[-3.61858,43.48167,56],[-3.61882,43.48181,58],[-3.61896,43.48186,59],[-3.6191,43.48189,61],[-3.61918,43.48191,61],[-3.61931,43.48195,62],[-3.61942,43.48199,62],[-3.61946,43.482,62],[-3.61951,43.48201,63],[-3.61962,43.482,63],[-3.62005,43.48189,66],[-3.62024,43.48184,67],[-3.62028,43.48182,67],[-3.62035,43.48178,67],[-3.62045,43.48171,68],[-3.62058,43.48165,68],[-3.62073,43.48158,68],[-3.62083,43.48164,69],[-3.62073,43.48158,68],[-3.62058,43.48165,68],[-3.62045,43.48171,68],[-3.62035,43.48178,67],[-3.62028,43.48182,67],[-3.62024,43.48184,67],[-3.62011,43.48221,66],[-3.62012,43.48251,65],[-3.62007,43.48262,64],[-3.62002,43.48269,64],[-3.62001,43.4827,64],[-3.61972,43.48288,62],[-3.61965,43.48292,61],[-3.6194,43.48302,60],[-3.6186,43.48335,60],[-3.61839,43.48342,60],[-3.61824,43.4835,59],[-3.61818,43.48354,59],[-3.61813,43.48358,59],[-3.61805,43.48365,59],[-3.61789,43.48405,58],[-3.61772,43.48431,57],[-3.61752,43.48455,57],[-3.61745,43.48461,56],[-3.61731,43.48473,56],[-3.61722,43.48477,56],[-3.61716,43.48479,56],[-3.61719,43.48482,56],[-3.61716,43.48479,56],[-3.61705,43.48479,56],[-3.61693,43.48477,56],[-3.61676,43.48473,55],[-3.61597,43.48443,51],[-3.61528,43.48425,51],[-3.61527,43.4843,51],[-3.61527,43.48435,51],[-3.61518,43.48447,51],[-3.61511,43.48451,51],[-3.6147,43.48457,51],[-3.61436,43.48489,50],[-3.61429,43.48499,49],[-3.61421,43.48514,49],[-3.61416,43.48526,48],[-3.61411,43.48533,48],[-3.61398,43.48546,47],[-3.61387,43.48551,47],[-3.61388,43.48555,47],[-3.61386,43.4857,47],[-3.61376,43.4859,46],[-3.61374,43.486,46],[-3.61371,43.48616,45],[-3.61374,43.486,46],[-3.61376,43.4859,46],[-3.61386,43.4857,47],[-3.61388,43.48555,47],[-3.61387,43.48551,47],[-3.61387,43.48548,47],[-3.61382,43.48536,47],[-3.61379,43.48514,47],[-3.61377,43.48511,47],[-3.61375,43.4851,47],[-3.61372,43.48508,47],[-3.61354,43.48504,46],[-3.61327,43.485,45],[-3.61299,43.48498,46],[-3.61281,43.48494,46],[-3.61265,43.48488,46],[-3.6125,43.48481,46],[-3.61241,43.48478,46],[-3.6123,43.48474,46],[-3.61228,43.48476,46],[-3.61224,43.48479,46],[-3.6122,43.4848,46],[-3.61224,43.48479,46],[-3.61228,43.48476,46],[-3.6123,43.48474,46],[-3.61241,43.48478,46],[-3.61238,43.48482,46],[-3.61232,43.48483,46],[-3.61228,43.48484,46],[-3.61224,43.48486,46],[-3.61221,43.48491,46],[-3.61218,43.485,46],[-3.61209,43.48514,46],[-3.61188,43.4854,46],[-3.61153,43.48575,45],[-3.61146,43.48581,45],[-3.61139,43.48586,44],[-3.61131,43.48589,44],[-3.61119,43.48593,43],[-3.61105,43.48597,42],[-3.6111,43.48592,42],[-3.61092,43.48595,41],[-3.61059,43.486,41],[-3.60999,43.48611,40],[-3.60942,43.48628,40],[-3.60906,43.48639,40],[-3.60895,43.48643,39],[-3.60882,43.48648,39],[-3.60864,43.4866,38],[-3.60853,43.48675,37],[-3.60845,43.48687,36],[-3.60845,43.48687,36],[-3.60818,43.48727,36],[-3.60799,43.48759,35],[-3.6078,43.48798,35],[-3.60765,43.48822,35],[-3.60757,43.48844,34],[-3.60751,43.48862,34],[-3.60758,43.48868,33],[-3.60747,43.489,32],[-3.60742,43.48912,32],[-3.60737,43.48928,32],[-3.6073,43.48927,33],[-3.60726,43.48927,33],[-3.60717,43.48948,35],[-3.60709,43.48959,36],[-3.60705,43.48967,37],[-3.60709,43.4897,37],[-3.60705,43.48969,37],[-3.60703,43.48968,37],[-3.60661,43.48952,38],[-3.60642,43.48944,39],[-3.6058,43.48916,41],[-3.60551,43.48884,43],[-3.60516,43.48859,44],[-3.60472,43.48856,45],[-3.60451,43.48852,45],[-3.60418,43.48849,46],[-3.60411,43.48848,46],[-3.60386,43.48841,46],[-3.60353,43.48822,45],[-3.60295,43.488,45],[-3.60288,43.48797,45],[-3.60267,43.48783,44],[-3.60245,43.48768,43],[-3.60243,43.4877,43],[-3.60234,43.48774,44],[-3.60199,43.48796,46],[-3.60178,43.48811,48],[-3.60171,43.48813,48],[-3.60167,43.48815,48],[-3.60129,43.48819,47],[-3.60109,43.48821,46],[-3.6008,43.48823,46],[-3.60079,43.48823,46],[-3.60024,43.48823,43],[-3.60014,43.48823,43],[-3.59955,43.48821,40],[-3.59952,43.4882,40],[-3.59921,43.48813,39],[-3.59909,43.4881,38],[-3.59903,43.48804,38],[-3.59901,43.48797,38],[-3.59898,43.48792,38],[-3.59902,43.48789,38],[-3.59908,43.48784,38],[-3.59931,43.48768,39],[-3.5994,43.48761,39],[-3.59959,43.48746,39],[-3.59978,43.48725,39],[-3.59992,43.48705,38],[-3.6,43.48687,37],[-3.60008,43.48673,36],[-3.6001,43.48669,36],[-3.60011,43.48666,36],[-3.6001,43.48669,36],[-3.60017,43.48673,36],[-3.60031,43.48678,37],[-3.60057,43.4869,38],[-3.6008,43.48701,39],[-3.60098,43.48712,40],[-3.60139,43.48729,42],[-3.6015,43.48732,42],[-3.6019,43.48746,43],[-3.6022,43.48754,43],[-3.60243,43.4876,43],[-3.60246,43.48758,43],[-3.60264,43.48749,42],[-3.60301,43.48724,42],[-3.60329,43.48709,42],[-3.6035,43.48696,42],[-3.60363,43.48688,43],[-3.60382,43.48671,44],[-3.60397,43.4866,44],[-3.60404,43.48657,44],[-3.60411,43.48659,45],[-3.60423,43.48665,45],[-3.6045,43.48679,45],[-3.60453,43.48673,45],[-3.60454,43.48672,45],[-3.60461,43.48661,45],[-3.60474,43.4863,44],[-3.60478,43.48608,44],[-3.6048,43.48585,44],[-3.60483,43.48559,43],[-3.60492,43.48539,42],[-3.60553,43.48434,43],[-3.60567,43.48405,43],[-3.60584,43.48377,44],[-3.60636,43.48304,44],[-3.60655,43.48272,45],[-3.6066,43.48257,45],[-3.60666,43.48267,45],[-3.60672,43.48277,45],[-3.60713,43.48334,46],[-3.60749,43.48371,46],[-3.60788,43.48409,47],[-3.60827,43.48444,48],[-3.60834,43.4845,48],[-3.6086,43.4846,47],[-3.60892,43.48468,46],[-3.60924,43.48474,45],[-3.60979,43.48483,44],[-3.61011,43.48488,43],[-3.61026,43.4849,43],[-3.61045,43.48491,43],[-3.61065,43.48492,43],[-3.6107,43.48492,43],[-3.61096,43.4849,44],[-3.61118,43.48485,44],[-3.61159,43.4847,45],[-3.61168,43.48469,45],[-3.61191,43.48468,46],[-3.61207,43.48469,46],[-3.61209,43.48467,46],[-3.61211,43.48465,46],[-3.61209,43.48467,46],[-3.61207,43.48469,46],[-3.61191,43.48468,46],[-3.61192,43.48465,46],[-3.61217,43.48395,45],[-3.61222,43.48396,45],[-3.61224,43.48381,44],[-3.61226,43.48372,44],[-3.61232,43.4834,44],[-3.61233,43.48331,44],[-3.61239,43.48296,44],[-3.6124,43.48291,44],[-3.61245,43.48259,44],[-3.61249,43.48239,44],[-3.6125,43.48235,44],[-3.61245,43.48208,45],[-3.61238,43.48165,46],[-3.6123,43.48119,45],[-3.61237,43.48118,45],[-3.61238,43.48118,45],[-3.61241,43.48118,45],[-3.6124,43.48111,44],[-3.61235,43.48082,44],[-3.61239,43.48082,44],[-3.61233,43.48051,45],[-3.61233,43.48048,45],[-3.61232,43.48045,45],[-3.61229,43.48045,45],[-3.61224,43.48022,46],[-3.61218,43.47996,47],[-3.61225,43.47995,47],[-3.61217,43.47958,47],[-3.61213,43.47958,47],[-3.61211,43.47948,47],[-3.61211,43.47941,47],[-3.61212,43.47937,47],[-3.61216,43.47935,47],[-3.61224,43.47922,47],[-3.61229,43.47916,47],[-3.61237,43.4791,47],[-3.61237,43.4791,47],[-3.61241,43.47908,47],[-3.61246,43.47903,47],[-3.61254,43.47898,47],[-3.6127,43.4789,47],[-3.61292,43.47879,46],[-3.61299,43.47873,46],[-3.61328,43.47841,45],[-3.61332,43.47836,45],[-3.61339,43.47819,44],[-3.61342,43.47781,42],[-3.6134,43.47749,40],[-3.61337,43.47744,40],[-3.61337,43.4772,41],[-3.61336,43.47709,41],[-3.61332,43.47708,41],[-3.6133,43.47694,41],[-3.61325,43.47683,41],[-3.61302,43.47632,43],[-3.61293,43.47622,43],[-3.61283,43.47618,43],[-3.61269,43.47615,43],[-3.6125,43.47617,42],[-3.61244,43.47618,42],[-3.61235,43.47619,42],[-3.61215,43.47619,43],[-3.61206,43.47618,43],[-3.61184,43.47613,43],[-3.61159,43.47604,44],[-3.61113,43.47584,45],[-3.61108,43.47582,45]],
        tags: ['Patrimonio', 'Casonas', 'Monumental'],
        gpxUrl: 'assets/tracks/ruta-monumentos.gpx'
    }
];

// ==================== COSTA / PATRIMONIO POINTS ====================
const costaPoints = [
    { id: 'faro-ajo', name: 'Faro de Ajo', coords: [-3.59548, 43.5114136], desc: 'Emblemático faro del Cabo de Ajo, el último construido en Cantabria y punto más septentrional de la región. Su torre, intervenida por el artista Okuda San Miguel, es un lienzo de color frente al Cantábrico.', url360: 'https://www.google.com/maps/embed?pb=!4v1770386601541!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJRGoxZGpBR1E.!2m2!1d43.51141593079667!2d-3.595283030812256!3f353.87!4f12.870000000000005!5f0.4000000000000002', location: 'Cabo de Ajo', tags: ['Faro', 'Okuda', 'Icono'], wikiTitle: 'Faro_de_Ajo' },
    { id: 'ria-ajo',    name: 'Ria de Ajo',            coords: [-3.5755, 43.5024], desc: 'Un entorno natural privilegiado donde el rio Campiazo se encuentra con el mar Cantabrico.',                                       location: 'Bareyo',        tags: ['Naturaleza', 'Rio', 'Mar'],          wikiTitle: 'Ría_de_Ajo' },
    { id: 'playa-ajo', name: 'Playa de Ajo (Antuerta)', coords: [-3.620022439528525, 43.49817414584101], desc: 'Playa de fina arena rodeada de acantilados, ideal para el surf y el descanso.', url360: 'https://www.google.com/maps/embed?pb=!4v1770386527939!6m8!1m7!1sCAoSHENJQUJJaEFHYndQVDVpQTFaV2ZZYl9RQUFUZlM.!2m2!1d43.49817414584101!2d-3.620022439528525!3f175.52!4f-16.060000000000002!5f0.7820865974627469', location: 'Costa de Ajo', tags: ['Playa', 'Surf', 'Arena'], beach: true, flag: 'sin-dato' },
    { id: 'playa-cuberris', name: 'Playa de Cuberris', coords: [-3.612572249364783, 43.49894444474292], desc: 'La gran playa de Ajo: casi un kilometro de arena dorada abierta al Cantabrico, muy popular para el surf y los paseos.', url360: 'https://www.google.com/maps/embed?pb=!4v1770386576592!6m8!1m7!1sCAoSHENJQUJJaEFHYndQVDVpQTFaV2ZZY0NZQUFRMVM.!2m2!1d43.49894444474292!2d-3.612572249364783!3f206.56775292273645!4f-11.512089507302008!5f0.7820865974627469', location: 'Ajo', tags: ['Playa', 'Surf', 'Arena'], wikiTitle: 'Playa_de_Cuberris', beach: true, flag: 'sin-dato' },
    { id: 'ojerada', name: 'La Ojerada', coords: [-3.5823984, 43.512174], desc: 'Ventanal natural de roca caliza: dos aberturas horadadas por el mar se asoman al Cantábrico. Monumento Natural en el litoral protegido del Cabo de Ajo, cerca del faro.', url360: 'https://www.google.com/maps/embed?pb=!4v1770386616737!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJRGoxWmlYQVE.!2m2!1d43.51214470982114!2d-3.582373781646112!3f331.07!4f-2.8700000000000045!5f0.7820865974627469', location: 'Costa de Ajo', tags: ['Geología', 'Arco', 'Acantilados'] },
    { id: 'ermita-san-roque', name: 'Ermita de San Roque', coords: [-3.6181003, 43.4711599], desc: 'Ermita de 1602 en un alto con vistas al Cantábrico, donde confluyen simbólicamente Ajo, Bareyo y Güemes. De nave única, dedicada a San Roque, protector contra epidemias y patrón de peregrinos.', url360: 'https://www.google.com/maps/embed?pb=!4v1746808617107!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJQ1hnWUtOa2dF!2m2!1d43.47106651837696!2d-3.620302487601843!3f17.381189324769142!4f-5.103795051546285!5f0.4000000000000002', location: 'Ajo - Güemes', tags: ['Ermita', 'Medieval', 'Camino'] }
];

// ==================== 3D POINTS ====================
const points3D = [
    { id: '3d-san-pedruco', name: 'Ermita de San Pedruco', coords: [-3.6224922, 43.4957], desc: 'Pequeña ermita del s. XII con elementos románicos, recientemente restaurada.', url360: 'https://my.matterport.com/show/?m=HhW2rUVukWt', location: 'Bareyo', tags: ['3D', 'Ermita', 'Románico'] },
    { id: '3d-sta-maria-bareyo', name: 'Santa María de Bareyo', coords: [-3.598793, 43.4724522], desc: 'Joya del románico cántabro (finales s. XII), con insólita cabecera trilobulada en forma de trébol. Capiteles esculpidos y pila bautismal con simbología medieval. Bien de Interés Cultural.', url360: 'https://my.matterport.com/show/?m=GX3uKCx4Y7Z', location: 'Bareyo', tags: ['3D', 'Románico', 'Iglesia'], wikiTitle: 'Iglesia_de_Santa_María_(Bareyo)' },
    { id: '3d-san-julian',         name: 'Ermita de San Julián',           coords: [-3.6319703, 43.4482986], desc: 'Ermita con raíces románicas y reformas góticas. Histórico hospital de peregrinos en el Camino de Santiago, hoy Centro de Interpretación del Camino.', url360: 'https://my.matterport.com/show/?m=jRKb9SMvGgV', location: 'Güemes', tags: ['3D', 'Ermita', 'Camino de Santiago'] },
    { id: '3d-san-vicente-guemes', name: 'Iglesia de San Vicente Mártir',   coords: [-3.639224, 43.4555711],  desc: 'Templo renacentista y gótico, obra de canteros locales en el valle de Güemes. Magnífico retablo barroco de 1677 con columnas salomónicas.', url360: 'https://my.matterport.com/show/?m=ayHJDVioJ3J', location: 'Güemes', tags: ['3D', 'Iglesia', 'Renacimiento'] },
    { id: '3d-san-martin-tours',   name: 'Iglesia de San Martín de Tours',  coords: [-3.6133003, 43.4802326], desc: 'Iglesia columnaria (s. XVI-XVIII) con orígenes como monasterio hacia el año 850. Planta de salón, bóvedas estrelladas y retablo barroco (1626-1630).', url360: 'https://my.matterport.com/show/?m=irtzhtLNSEY', location: 'Ajo', tags: ['3D', 'Iglesia', 'Renacimiento'] },
    { id: '3d-san-ildefonso',      name: 'Convento de San Ildefonso',       coords: [-3.6010296, 43.4881776], desc: 'Convento dominico fundado en 1588 y proyectado por Diego de Sisniega, maestro ligado a El Escorial. Exponente temprano del clasicismo cántabro, hoy Centro de Interpretación del Camino.', url360: 'https://my.matterport.com/show/?m=xutAUpvDc7W', location: 'Ajo', tags: ['3D', 'Convento', 'Historia'] }
];

// ==================== BUSINESS CATEGORIES ====================
const BUSINESS_CATEGORIES = {
    all:          { label: 'Todos',        emoji: '📍', color: '#6366F1' },
    alojamiento:  { label: 'Alojamiento',  emoji: '🏨', color: '#8B5CF6' },
    restauracion: { label: 'Restaurantes', emoji: '🍽️', color: '#EF4444' },
    comercio:     { label: 'Comercio',     emoji: '🛒', color: '#F59E0B' },
    surf:         { label: 'Surf & Ocio',  emoji: '🏄', color: '#06B6D4' },
    salud:        { label: 'Salud',        emoji: '💊', color: '#10B981' },
    servicios:    { label: 'Servicios',    emoji: '🔧', color: '#64748B' }
};

// ==================== CATEGORY EMOJIS ====================
const CATEGORY_EMOJIS = {
    'hiking': '🥾',
    'costa':  '⛪',
    'biz':    '📍',
    '3d':     '🧊',
    'alojamiento':  '🏨',
    'restauracion': '🍽️',
    'comercio':     '🛒',
    'surf':         '🏄',
    'salud':        '💊',
    'servicios':    '🔧',
    'Hotel':             '🏨',
    'Hotel Rural':       '🏡',
    'Hotel 5★':          '⭐',
    'Posada':            '🏡',
    'Casa Rural':        '🏡',
    'Camping':           '⛺',
    'Albergue':          '🎒',
    'Apartamento':       '🏢',
    'Apartamentos':      '🏢',
    'Casa Vacacional':   '🏖️',
    'Casona':            '🏰',
    'Hostal':            '🛏️',
    'Restaurante':       '🍽️',
    'Bar/Restaurante':   '🍺',
    'Bar/Café':          '☕',
    'Bar':               '🍺',
    'Taberna':           '🍷',
    'Gastrobar':         '🍸',
    'Asador':            '🔥',
    'Mesón':             '🍖',
    'Pub':               '🎵',
    'Heladería':         '🍦',
    'Cafetería':         '☕',
    'Pastelería':        '🧁',
    'Marisquería':       '🦐',
    'Escuela de Surf':   '🏄',
    'Surf Camp':         '🏄',
    'Paintball':         '🎯',
    'Gimnasio':          '💪',
    'Farmacia':          '💊',
    'Supermercado':      '🛒',
    'Peluquería':        '💇',
    'Centro de estética':'💅',
    'default':           '📍'
};

// ==================== DEFAULT IMAGES ====================
const BIZ_DEFAULT_IMAGES = {
    alojamiento:  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=400&fit=crop&q=80',
    restauracion: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop&q=80',
    comercio:     'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop&q=80',
    surf:         'https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&h=400&fit=crop&q=80',
    salud:        'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop&q=80',
    servicios:    'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=400&fit=crop&q=80',
    // Subcategorias especificas
    'Hotel':              'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=400&fit=crop&q=80',
    'Hotel Rural':        'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop&q=80',
    'Hotel 5★':           'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=400&fit=crop&q=80',
    'Posada':             'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop&q=80',
    'Casa Rural':         'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop&q=80',
    'Camping':            'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=400&fit=crop&q=80',
    'Albergue':           'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=400&fit=crop&q=80',
    'Apartamento':        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop&q=80',
    'Apartamentos':       'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop&q=80',
    'Casa Vacacional':    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop&q=80',
    'Casona':             'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop&q=80',
    'Hostal':             'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&h=400&fit=crop&q=80',
    'Restaurante':        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&q=80',
    'Bar/Restaurante':    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Bar/Café':           'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Bar':                'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Taberna':            'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Gastrobar':          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=400&fit=crop&q=80',
    'Asador':             'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&q=80',
    'Mesón':              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&q=80',
    'Pub':                'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Heladería':          'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&h=400&fit=crop&q=80',
    'Cafetería':          'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=400&fit=crop&q=80',
    'Pastelería':         'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=800&h=400&fit=crop&q=80',
    'Marisquería':        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=400&fit=crop&q=80',
    'Escuela de Surf':    'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&h=400&fit=crop&q=80',
    'Surf Camp':          'https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&h=400&fit=crop&q=80',
    'Paintball':          'https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=800&h=400&fit=crop&q=80',
    'Gimnasio':           'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop&q=80',
    'Farmacia':           'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&h=400&fit=crop&q=80',
    'Supermercado':       'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=400&fit=crop&q=80',
    'Peluquería':         'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop&q=80',
    'Centro de estética': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=400&fit=crop&q=80'
};

function getBizImage(biz) {
    // Priority cascade: local file → explicit Unsplash URL → category default → fallback
    if (biz.localImage) return biz.localImage;
    if (biz.image) return biz.image;
    return BIZ_DEFAULT_IMAGES[biz.subcategory] || BIZ_DEFAULT_IMAGES[biz.category] || BIZ_DEFAULT_IMAGES.alojamiento;
}

// ==================== BUSINESSES ====================
const businesses = [
    // -- ALOJAMIENTO: HOTELES --
    { id: 'biz-001', name: 'Hotel Palacio de la Peña',          category: 'alojamiento', subcategory: 'Hotel 5★',      coords: [-3.6128, 43.4838],       location: 'Ajo, Barrio Peña 26',          desc: 'Exclusivo hotel de lujo en un palacio del siglo XVI, con 8.000 m² de jardines amurallados y una coleccion de arte y antiguedades.',                                                                           phone: '942 670 067', website: 'https://palacespain.com',            hours: 'Recepcion 24h',                                         tags: ['Lujo', 'Palacio', 'Historico'] },
    { id: 'biz-002', name: 'Hotel Rural Posada Casa Azaga',      category: 'alojamiento', subcategory: 'Hotel Rural',   coords: [-3.5976889, 43.4983117],  location: 'Ajo',                          desc: 'Encantador hotel rural con ambiente familiar y vistas a la costa cantabrica.',                                                                                                                                  phone: '942 670 242',                                           hours: 'Recepcion 9:00–22:00',                                  tags: ['Rural', 'Familiar'] },
    { id: 'biz-003', name: 'Alima Surf & Hotel',                 category: 'alojamiento', subcategory: 'Hotel / Surf',  coords: [-3.6067291, 43.495973],   location: 'Ajo',                          desc: 'Hotel orientado al surf con alojamiento comodo cerca de las playas de Ajo.',                                                                                                                                   phone: '682 102 038',                                           hours: 'Recepcion 9:00–21:00',                                  tags: ['Surf', 'Playa'] },
    { id: 'biz-004', name: 'Hotel Costa De Ajo',                 category: 'alojamiento', subcategory: 'Hotel',         coords: [-3.6141912, 43.4948203],  location: 'Ajo',                          desc: 'Hotel con ubicacion privilegiada junto a las playas de Ajo.',                                                                                                                                                  phone: '942 670 407',                                           hours: 'Recepcion 8:00–23:00',                                  tags: ['Playa', 'Costa'] },
    { id: 'biz-005', name: 'Hotel Rural El Angel De La Guarda',  category: 'alojamiento', subcategory: 'Hotel Rural',   coords: [-3.634713, 43.4560266],   location: 'Guemes',                       desc: 'Hotel rural con encanto donde cada detalle esta pensado para una estancia inolvidable.',                                                                                                                        phone: '942 621 387', website: 'https://www.elangeldelaguarda.es', hours: 'Recepcion 10:00–22:00', image: 'https://www.elangeldelaguarda.es/wp-content/uploads/go-x/u/a8f30f69-855f-495b-bc9d-b0a533ab40c5/l3,t0,w1492,h1492/image-768x768.png', tags: ['Rural', 'Encanto', 'Guemes'] },
    { id: 'biz-006', name: 'Hotel Brisa de Quintres',            category: 'alojamiento', subcategory: 'Hotel',         coords: [-3.6124663, 43.4855693],  location: 'Ajo - Lurcia',                 desc: 'Hotel con vistas al campo y la costa, ambiente tranquilo en el barrio de Lurcia.',                                                                                                                             phone: '942 670 553',                                           hours: 'Recepcion 9:00–22:00',                                  tags: ['Tranquilo', 'Vistas'] },
    { id: 'biz-007', name: 'Hotel la Lagartija',                 category: 'alojamiento', subcategory: 'Hotel',         coords: [-3.6094126, 43.5000585],  location: 'Ajo (playa)',                  desc: 'Hotel acogedor junto a la playa de Ajo, ideal para disfrutar del mar.',                                                                                                                                        phone: '942 670 212',                                           hours: 'Recepcion 9:00–22:00',                                  tags: ['Playa', 'Acogedor'] },
    { id: 'biz-008', name: 'Hostal Labu',                        category: 'alojamiento', subcategory: 'Hostal',        coords: [-3.6124618, 43.4812794],  location: 'Ajo',                          desc: 'Hostal moderno en el centro de Ajo con restauracion propia.',                                                                                                                                                  phone: '942 670 100',                                           hours: 'Recepcion 8:00–23:00',                                  tags: ['Centro', 'Economico'] },

    // -- ALOJAMIENTO: POSADAS --
    { id: 'biz-009', name: 'Posada Camino del Norte',            category: 'alojamiento', subcategory: 'Posada',        coords: [-3.637519, 43.457786],    location: 'Guemes',                       desc: 'Posada rural en el Camino de Santiago, ideal para peregrinos y viajeros.',                                                                                                                                     phone: '942 621 292',                                           hours: 'Recepcion 10:00–22:00',                                 tags: ['Camino de Santiago', 'Peregrinos', 'Guemes'] },
    { id: 'biz-010', name: 'Posada Rural Valle de Guemes',       category: 'alojamiento', subcategory: 'Posada',        coords: [-3.6359204, 43.4553998],  location: 'Guemes',                       desc: 'Casa de labranza cantabra restaurada con 9 habitaciones con jacuzzi e hidromasaje dobles.',                                                                                                                    phone: '942 621 161', website: 'https://valledeguemes.com',    hours: 'Recepcion 10:00–22:00', image: 'https://valledeguemes.com/wp-content/uploads/2025/10/8-980x654.jpg', tags: ['Jacuzzi', 'Restaurada', 'Guemes'] },
    { id: 'biz-011', name: 'Posada de Ajo',                      category: 'alojamiento', subcategory: 'Posada',        coords: [-3.6194067, 43.4718018],  location: 'Ajo',                          desc: 'Posada con encanto en un entorno rural, cerca de las playas y rutas de senderismo.',                                                                                                                           phone: '942 670 471',                                           hours: 'Recepcion 10:00–21:00',                                 tags: ['Rural', 'Senderismo'] },

    // -- ALOJAMIENTO: APARTAMENTOS Y CASAS --
    { id: 'biz-012', name: 'Casa Calma en Ajo',                  category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6188018, 43.4713309],  location: 'Ajo',                          desc: 'Casa rural tranquila con todas las comodidades para una escapada relajante.',                                                                                                                                   tags: ['Tranquilidad', 'Familiar'] },
    { id: 'biz-013', name: 'El Solar de Nene',                   category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6153889, 43.4750634],  location: 'Ajo',                          desc: 'Alojamiento rural con caracter y encanto en el corazon de Ajo.',                                                                                                                                               tags: ['Encanto'] },
    { id: 'biz-014', name: 'Casa Santa Ana',                     category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6106191, 43.479026],   location: 'Ajo',                          desc: 'Casa rural con historia y ambiente acogedor.',                                                                                                                                                                  tags: ['Historica'] },
    { id: 'biz-015', name: 'Casuca El Trisquel',                 category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.5998306, 43.4679358],  location: 'Bareyo',                       desc: 'Casuca tipica cantabra rehabilitada con encanto y comodidades modernas.',                                                                                                                                       tags: ['Tipica', 'Cantabra'] },
    { id: 'biz-016', name: 'Casonas de Ajo',                     category: 'alojamiento', subcategory: 'Casona',        coords: [-3.6124652, 43.484989],   location: 'Ajo - Lurcia',                 desc: 'Conjunto de casonas restauradas con caracter senorial.',                                                                                                                                                        tags: ['Senorial', 'Restaurada'] },
    { id: 'biz-017', name: 'Casona de la Cuesta Camino',         category: 'alojamiento', subcategory: 'Casona',        coords: [-3.6119257, 43.4855937],  location: 'Ajo - Lurcia',                 desc: 'Casona tradicional con jardin y vistas al campo.',                                                                                                                                                              tags: ['Jardin', 'Vistas'] },
    { id: 'biz-018', name: 'Casona de Llabad del Camino',        category: 'alojamiento', subcategory: 'Casona',        coords: [-3.6131852, 43.4864512],  location: 'Ajo - Lurcia',                 desc: 'Casona senorial en la ruta del Camino del Norte.',                                                                                                                                                              tags: ['Camino', 'Senorial'] },
    { id: 'biz-019', name: 'Villa Vista Ajo',                    category: 'alojamiento', subcategory: 'Apartamento',   coords: [-3.6189265, 43.4818082],  location: 'Ajo',                          desc: 'Apartamento con excelentes vistas en Ajo.',                                                                                                                                                                     tags: ['Vistas', 'Moderno'] },
    { id: 'biz-020', name: 'Casa Ave',                           category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6188035, 43.4831397],  location: 'Ajo',                          desc: 'Casa rural rodeada de naturaleza con ambiente tranquilo.',                                                                                                                                                      tags: ['Naturaleza'] },
    { id: 'biz-021', name: 'Apartamento Benedicto',              category: 'alojamiento', subcategory: 'Apartamento',   coords: [-3.6125833, 43.4806944],  location: 'Ajo',                          desc: 'Apartamento centrico en la avenida principal de Ajo.',                                                                                                                                                          tags: ['Centro', 'Centrico'] },
    { id: 'biz-022', name: 'Apartamento Ajo',                    category: 'alojamiento', subcategory: 'Apartamento',   coords: [-3.6122611, 43.4832104],  location: 'Ajo',                          desc: 'Apartamento turistico bien equipado en Ajo.',                                                                                                                                                                   tags: ['Equipado'] },
    { id: 'biz-023', name: 'Apartamentos La Ermita de Lurcia',   category: 'alojamiento', subcategory: 'Apartamentos',  coords: [-3.61292, 43.48603],      location: 'Ajo - Lurcia',                 desc: 'Apartamentos junto a la ermita de Lurcia, entorno tranquilo y rural.',                                                                                                                                          tags: ['Ermita', 'Tranquilo'] },
    { id: 'biz-024', name: 'Apartamentos La Venera',             category: 'alojamiento', subcategory: 'Apartamentos',  coords: [-3.5872403, 43.4660232],  location: 'Bareyo',                       desc: 'Apartamentos cerca del Molino de la Venera y la iglesia romanica de Bareyo.',                                                                                                                                  tags: ['Romanico', 'Molino'] },
    { id: 'biz-025', name: 'El Balcon al Descanso',              category: 'alojamiento', subcategory: 'Apartamento',   coords: [-3.6134033, 43.4826739],  location: 'Ajo',                          desc: 'Alojamiento con balcon y vistas, ideal para descansar.',                                                                                                                                                        tags: ['Balcon', 'Descanso'] },
    { id: 'biz-026', name: 'La Campona',                         category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6129999, 43.4832919],  location: 'Ajo',                          desc: 'Alojamiento rural en el centro de Ajo.',                                                                                                                                                                        tags: ['Centro'] },
    { id: 'biz-027', name: 'Casa Los Acantilados de Ajo',        category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6132718, 43.4832248],  location: 'Ajo',                          desc: 'Casa con nombre que evoca los espectaculares acantilados de la zona.',                                                                                                                                          tags: ['Acantilados'] },
    { id: 'biz-028', name: 'Casa Blanca Guemes',                 category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.6450393, 43.4518972],  location: 'Guemes',                       desc: 'Alojamiento rural en Guemes, en pleno Camino del Norte.',                                                                                                                                                       tags: ['Guemes', 'Camino'] },
    { id: 'biz-029', name: 'La Casa de Marino',                  category: 'alojamiento', subcategory: 'Casa Rural',    coords: [-3.5963267, 43.5074873],  location: 'Ajo (playa)',                  desc: 'Casa amplia junto a la costa con jardin y excelente ubicacion.',                                                                                                                                                tags: ['Playa', 'Jardin'] },
    { id: 'biz-030', name: 'Casa de AnMar',                      category: 'alojamiento', subcategory: 'Casa Vacacional', coords: [-3.5985338, 43.5054491], location: 'Ajo',                         desc: 'Casa amplia con jardin, ideal para familias y grupos.',                                                                                                                                                         tags: ['Familiar', 'Jardin'] },
    { id: 'biz-031', name: 'La Cabana de la Playa',              category: 'alojamiento', subcategory: 'Casa Vacacional', coords: [-3.609958, 43.5003942],  location: 'Ajo (playa)',                  desc: 'Alojamiento encantador junto a la playa.',                                                                                                                                                                      tags: ['Playa', 'Encantador'] },
    { id: 'biz-032', name: 'La Casona de la Playa',              category: 'alojamiento', subcategory: 'Casona',        coords: [-3.6096778, 43.5003701],  location: 'Ajo (playa)',                  desc: 'Casona senorial restaurada frente al mar.',                                                                                                                                                                     tags: ['Playa', 'Senorial'] },

    // -- ALOJAMIENTO: CAMPINGS --
    { id: 'biz-033', name: 'Camping Cabo de Ajo',                category: 'alojamiento', subcategory: 'Camping',       coords: [-3.597121, 43.505048],    location: 'Ajo (playa)',                  desc: 'Camping a pocos metros de la playa con todas las instalaciones.',                                                                                                                                              phone: '942 670 509',                                           hours: 'Recepcion 8:00–22:00 (temporada)',                       tags: ['Playa', 'Camping'] },
    { id: 'biz-034', name: 'Camping Playa de Ajo',               category: 'alojamiento', subcategory: 'Camping',       coords: [-3.616073, 43.495251],    location: 'Ajo',                          desc: 'Camping familiar junto a las playas de Cuberris y Antuerta.',                                                                                                                                                  phone: '942 670 213',                                           hours: 'Recepcion 8:30–21:30 (temporada)',                       tags: ['Familiar', 'Playa'] },
    { id: 'biz-035', name: 'Camping Arenas',                     category: 'alojamiento', subcategory: 'Camping',       coords: [-3.6158992, 43.4921213],  location: 'Ajo',                          desc: 'Camping con 200 parcelas, bungalows y habitaciones a 100 metros de las playas.',                                                                                                                               phone: '942 670 371', website: 'https://campingarenas.com',     hours: 'Recepcion 8:00–22:00 (temporada)',                       tags: ['Bungalows', 'Parcelas'] },
    { id: 'biz-036', name: 'Camping Los Molinos de Bareyo',      category: 'alojamiento', subcategory: 'Camping',       coords: [-3.6086425, 43.4641854],  location: 'Bareyo',                       desc: 'Camping con bungalows de distintos tamanos en un entorno natural privilegiado.',                                                                                                                                phone: '942 621 244',                                           hours: 'Recepcion 9:00–21:00 (temporada)',                       tags: ['Bungalows', 'Natural'] },

    // -- ALOJAMIENTO: ALBERGUE --
    { id: 'biz-037', name: 'Albergue La Cabana del Abuelo Peuto', category: 'alojamiento', subcategory: 'Albergue',     coords: [-3.6453898, 43.4479053],  location: 'Guemes',                       desc: 'Mitico albergue de peregrinos del Camino del Norte, gestionado por el padre Ernesto. Una experiencia unica de hospitalidad y acogida.',                                                                        phone: '616 791 996',                                           hours: 'Acogida a peregrinos 15:00–20:00',                       tags: ['Peregrinos', 'Camino de Santiago', 'Guemes'] },

    // -- RESTAURACION: RESTAURANTES --
    { id: 'biz-038', name: 'Restaurante Pescador',               category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6134076, 43.4955125],  location: 'Ajo',                          desc: 'Restaurante de pescado y marisco fresco con vistas al mar.',                                                                                                                                                   phone: '942 670 350',                                           hours: 'Mar-Dom 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Pescado', 'Marisco', 'Vistas'] },
    { id: 'biz-039', name: 'Restaurante ANJUA',                  category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.612648, 43.4934929],   location: 'Ajo',                          desc: 'Cocina tradicional cantabra con toques de autor y productos de la zona.',                                                                                                                                       phone: '942 670 115',                                           hours: 'Mie-Lun 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Cantabra', 'Autor'] },
    { id: 'biz-040', name: 'Asador Cueva De Las Brujas',         category: 'restauracion', subcategory: 'Asador',       coords: [-3.5926959, 43.4875429],  location: 'Ajo',                          desc: 'Asador con ambiente rustico y carnes a la brasa de primera calidad.',                                                                                                                                           phone: '942 670 081',                                           hours: 'Jue-Mar 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Asador', 'Carnes', 'Brasa'] },
    { id: 'biz-041', name: 'Restaurante El Rincon de Pitucos',   category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6007785, 43.4862027],  location: 'Ajo',                          desc: 'Restaurante familiar con cocina casera y raciones generosas.',                                                                                                                                                  phone: '942 670 301',                                           hours: 'Mie-Lun 12:30–16:00, Vie-Sab 20:00–23:00',              tags: ['Casero', 'Familiar', 'Raciones'] },
    { id: 'biz-042', name: 'Restaurante La Casuca',              category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6125076, 43.4809412],  location: 'Ajo',                          desc: 'Cocina tradicional en una casuca cantabra en el centro de Ajo.',                                                                                                                                               phone: '942 670 195',                                           hours: 'Jue-Mar 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Tradicional', 'Centro'] },
    { id: 'biz-043', name: 'Restaurante Carlos III',             category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6127148, 43.4816322],  location: 'Ajo',                          desc: 'Restaurante clasico con amplia carta y menu del dia.',                                                                                                                                                          phone: '942 670 185',                                           hours: 'Lun-Sab 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Clasico', 'Menu del dia'] },
    { id: 'biz-044', name: 'Restaurante Distrito 23',            category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6126791, 43.4831462],  location: 'Ajo',                          desc: 'Restaurante moderno con propuestas gastronomicas actuales.',                                                                                                                                                    phone: '942 670 500',                                           hours: 'Jue-Lun 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Moderno', 'Gastro'] },
    { id: 'biz-045', name: 'Meson Lurcia',                       category: 'restauracion', subcategory: 'Mesón',        coords: [-3.6123961, 43.4858555],  location: 'Ajo - Lurcia',                 desc: 'Meson con cocina casera cantabra en el barrio de Lurcia.',                                                                                                                                                      phone: '942 670 022',                                           hours: 'Mie-Lun 12:00–16:00',                                   tags: ['Casero', 'Meson'] },
    { id: 'biz-046', name: 'M-30 GASTROBAR',                     category: 'restauracion', subcategory: 'Gastrobar',    coords: [-3.61295, 43.4829099],    location: 'Ajo',                          desc: 'Gastrobar con tapas creativas y ambiente moderno en el centro de Ajo.',                                                                                                                                         phone: '942 670 320',                                           hours: 'Jue-Mar 11:00–23:00',                                   tags: ['Tapas', 'Moderno'] },
    { id: 'biz-047', name: 'Bar Luis / Restaurante Luis',        category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6355, 43.4562],        location: 'Guemes, Bo. Iglesia 5',        desc: 'Restaurante emblematico de Guemes. Cocina tradicional cantabra, mariscos, carnes a la brasa y postres caseros. 4.5★ con mas de 560 resenas.',                                                                phone: '942 621 082',                                           hours: 'Mie-Lun 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Emblematico', 'Tradicional', 'Guemes'] },
    { id: 'biz-048', name: 'Restaurante Guemes (Kaliskka)',       category: 'restauracion', subcategory: 'Restaurante',  coords: [-3.6350, 43.4558],        location: 'Guemes, C. Pomero 101',        desc: 'Restaurante acogedor con carnes a la brasa y pescado fresco del Cantabrico.',                                                                                                                                  phone: '942 621 500',                                           hours: 'Jue-Mar 13:00–16:00, Vie-Sab 20:30–23:00',              tags: ['Brasa', 'Pescado', 'Guemes'] },

    // -- RESTAURACION: BARES Y CAFETERIAS --
    { id: 'biz-049', name: 'Bar-restaurante La Terraza',         category: 'restauracion', subcategory: 'Bar/Restaurante', coords: [-3.6360598, 43.4557086], location: 'Guemes',                     desc: 'Bar restaurante con terraza y cocina casera montanesa: cocido montanes y cabrito guisado.',                                                                                                                     phone: '942 621 016',                                           hours: 'Mie-Lun 10:00–23:00',                                   tags: ['Terraza', 'Casero', 'Guemes'] },
    { id: 'biz-050', name: 'Bar restaurante Food And RockAndRoll', category: 'restauracion', subcategory: 'Bar/Restaurante', coords: [-3.6229889, 43.4515342], location: 'Bareyo',                  desc: 'Bar con personalidad rockera, hamburguesas y ambiente informal.',                                                                                                                                               hours: 'Vie-Dom 12:00–23:00',                                                                                                   tags: ['Rock', 'Hamburguesas', 'Informal'] },
    { id: 'biz-051', name: 'Los Arcos Bar-Cafe',                 category: 'restauracion', subcategory: 'Bar/Café',      coords: [-3.6123221, 43.479724],   location: 'Ajo',                          desc: 'Bar-cafe en el centro de Ajo, ideal para desayunos y aperitivos.',                                                                                                                                             phone: '942 670 170',                                           hours: 'Lun-Dom 8:00–22:00',                                    tags: ['Cafe', 'Desayunos', 'Centro'] },
    { id: 'biz-052', name: 'Taberna La Cientifica',              category: 'restauracion', subcategory: 'Taberna',       coords: [-3.6122398, 43.479846],   location: 'Ajo',                          desc: 'Taberna con encanto, vinos y pinchos en el centro del pueblo.',                                                                                                                                                hours: 'Jue-Mar 11:00–23:00',                                                                                                   tags: ['Vinos', 'Pinchos'] },
    { id: 'biz-053', name: 'Bar La Oficina',                     category: 'restauracion', subcategory: 'Bar',           coords: [-3.61295, 43.4829099],    location: 'Ajo',                          desc: 'Bar popular entre los locales con ambiente animado.',                                                                                                                                                           hours: 'Lun-Dom 10:00–00:00',                                                                                                   tags: ['Local', 'Animado'] },
    { id: 'biz-054', name: 'Bar LOS ESPINOS',                    category: 'restauracion', subcategory: 'Bar',           coords: [-3.6118456, 43.4833428],  location: 'Ajo',                          desc: 'Bar de barrio con terraza y tapas variadas.',                                                                                                                                                                   hours: 'Lun-Dom 9:00–23:00',                                                                                                    tags: ['Terraza', 'Tapas'] },
    { id: 'biz-055', name: 'Bar La Terraza (Lurcia)',            category: 'restauracion', subcategory: 'Bar',           coords: [-3.6113958, 43.4859069],  location: 'Ajo - Lurcia',                 desc: 'Bar con terraza amplia en el barrio de Lurcia.',                                                                                                                                                                hours: 'Mie-Lun 10:00–22:00',                                                                                                   tags: ['Terraza', 'Lurcia'] },
    { id: 'biz-056', name: 'PUB MARES',                          category: 'restauracion', subcategory: 'Pub',           coords: [-3.6121613, 43.4835991],  location: 'Ajo',                          desc: 'Pub nocturno con copas y musica para las noches de Ajo.',                                                                                                                                                       hours: 'Jue-Sab 21:00–03:00',                                                                                                   tags: ['Copas', 'Noche'] },
    { id: 'biz-057', name: 'Cafeteria Los Molinos de Bareyo',    category: 'restauracion', subcategory: 'Cafetería',     coords: [-3.6147105, 43.468435],   location: 'Bareyo',                       desc: 'Cafeteria junto al camping Los Molinos, ambiente relajado.',                                                                                                                                                    hours: 'Lun-Dom 9:00–20:00',                                                                                                    tags: ['Cafe', 'Relajado'] },

    // -- RESTAURACION: COMIDA PARA LLEVAR / ESPECIALIDADES --
    { id: 'biz-058', name: 'Pollos Asados',                      category: 'restauracion', subcategory: 'Comida para llevar', coords: [-3.6119165, 43.4835515], location: 'Ajo',                    desc: 'Pollos asados al estilo tradicional para llevar.',                                                                                                                                                              hours: 'Lun-Sab 10:00–14:00, 17:00–20:00',                                                                                      tags: ['Para llevar', 'Pollos'] },
    { id: 'biz-059', name: 'Heladeria Antiu Xixona Ajo',         category: 'restauracion', subcategory: 'Heladería',      coords: [-3.6126502, 43.4820827],  location: 'Ajo',                          desc: 'Helados artesanales de la reconocida marca Antiu Xixona.',                                                                                                                                                     hours: 'Lun-Dom 11:00–22:00 (verano)',                                                                                          tags: ['Helados', 'Artesanal'] },
    { id: 'biz-060', name: 'Delicias',                           category: 'restauracion', subcategory: 'Pastelería',     coords: [-3.6123059, 43.4831053],  location: 'Ajo',                          desc: 'Pasteleria y bolleria con dulces caseros y cafe.',                                                                                                                                                              hours: 'Mar-Dom 8:00–20:00',                                                                                                    tags: ['Pasteleria', 'Dulces'] },
    { id: 'biz-061', name: 'MARISCOS CABO DE AJO S.L.U.',        category: 'restauracion', subcategory: 'Marisquería',    coords: [-3.6125888, 43.4818597],  location: 'Ajo',                          desc: 'Venta de marisco fresco de la costa de Ajo. Bogavantes, centollos, necoras y percebes.',                                                                                                                       phone: '942 670 049',                                           hours: 'Mar-Sab 10:00–14:00, 17:00–20:00',                      tags: ['Marisco', 'Fresco', 'Local'] },
    { id: 'biz-062', name: 'Limonadas Ines y Carmen',            category: 'restauracion', subcategory: 'Bebidas artesanales', coords: [-3.5949168, 43.4658255], location: 'Bareyo',                 desc: 'Limonadas artesanales frescas, perfectas para los dias de verano.',                                                                                                                                             tags: ['Artesanal', 'Limonada', 'Verano'] },
    { id: 'biz-063', name: 'Mi Bodega',                          category: 'restauracion', subcategory: 'Vinoteca/Tienda', coords: [-3.6133402, 43.482361],   location: 'Ajo',                         desc: 'Tienda de vinos, conservas y productos gourmet de la region.',                                                                                                                                                  hours: 'Mar-Sab 10:00–14:00, 17:00–21:00',                                                                                      tags: ['Vinos', 'Gourmet'] },

    // -- COMERCIO --
    { id: 'biz-064', name: 'Carrefour Express',                  category: 'comercio',     subcategory: 'Supermercado',   coords: [-3.6125433, 43.4806542],  location: 'Ajo',                         desc: 'Supermercado con amplio surtido de alimentacion y productos basicos.',                                                                                                                                          phone: '942 670 285',                                           hours: 'Lun-Sab 9:00–21:30',                                    tags: ['Supermercado', 'Alimentacion'] },
    { id: 'biz-065', name: 'Supermercados Dia',                  category: 'comercio',     subcategory: 'Supermercado',   coords: [-3.6121634, 43.482707],   location: 'Ajo, Av. Benedicto Ruiz 792', desc: 'Supermercado de barrio con buenos precios y productos frescos.',                                                                                                                                               phone: '942 670 320',                                           hours: 'Lun-Sab 9:00–21:30',                                    tags: ['Supermercado', 'Economico'] },
    { id: 'biz-066', name: 'COVIRAN',                            category: 'comercio',     subcategory: 'Supermercado',   coords: [-3.6126231, 43.4835995],  location: 'Ajo',                          desc: 'Supermercado de proximidad con productos frescos y de calidad.',                                                                                                                                                hours: 'Lun-Sab 9:00–21:00',                                                                                                    tags: ['Supermercado', 'Proximidad'] },
    { id: 'biz-067', name: 'Carniceria Gerardo Alvarez',         category: 'comercio',     subcategory: 'Carnicería',     coords: [-3.6118473, 43.4807156],  location: 'Ajo',                          desc: 'Carniceria tradicional con carne de la region y embutidos artesanales.',                                                                                                                                        phone: '942 670 155',                                           hours: 'Mar-Sab 9:00–14:00, 17:00–20:00',                       tags: ['Carniceria', 'Artesanal'] },
    { id: 'biz-068', name: 'El Estanco',                         category: 'comercio',     subcategory: 'Estanco',        coords: [-3.6119843, 43.4800476],  location: 'Ajo',                          desc: 'Estanco con prensa, tabaco y articulos varios.',                                                                                                                                                                hours: 'Lun-Sab 8:30–20:00, Dom 9:00–14:00',                                                                                    tags: ['Prensa', 'Tabaco'] },
    { id: 'biz-069', name: 'Tienda Semilac',                     category: 'comercio',     subcategory: 'Cosmética',      coords: [-3.611689, 43.482223],    location: 'Ajo',                          desc: 'Tienda especializada en productos de manicura y cosmetica profesional.',                                                                                                                                         hours: 'Lun-Vie 10:00–14:00, 17:00–20:00',                                                                                      tags: ['Cosmetica', 'Manicura'] },
    { id: 'biz-070', name: 'Masstige: Espacio de Moda',          category: 'comercio',     subcategory: 'Moda',           coords: [-3.6117384, 43.4821927],  location: 'Ajo',                          desc: 'Tienda de moda y complementos con las ultimas tendencias.',                                                                                                                                                     hours: 'Lun-Sab 10:30–14:00, 17:00–20:30',                                                                                      tags: ['Moda', 'Tendencias'] },
    { id: 'biz-071', name: 'Antiguedades Gargollo',              category: 'comercio',     subcategory: 'Antigüedades',   coords: [-3.6466905, 43.4541322],  location: 'Guemes',                       desc: 'Tienda de antiguedades y objetos de coleccion con piezas unicas.',                                                                                                                                              tags: ['Antiguedades', 'Coleccion', 'Guemes'] },

    // -- SURF & OCIO --
    { id: 'biz-072', name: 'Ajo Surf School',                    category: 'surf',         subcategory: 'Escuela de Surf', coords: [-3.614083, 43.495872],   location: 'Playa de Ajo',                desc: 'Escuela de surf en la playa de Ajo con clases para todos los niveles, desde iniciacion hasta perfeccionamiento. Dirigida por Michel Velasco, Campeon Nacional de Surf.',                                       phone: '679 899 505', website: 'https://www.ajosurfschool.com', hours: 'Lun-Dom 9:00–20:00 (temporada)', image: 'https://cdn1.yumping.com/emp/fotos/28/E/000001279/640/surf%20ajo%205.jpg', tags: ['Surf', 'Clases', 'Playa'] },
    { id: 'biz-073', name: 'Ajo Surf Cantabria',                 category: 'surf',         subcategory: 'Surf',           coords: [-3.6139454, 43.4953812],  location: 'Playa de Ajo',                desc: 'Alquiler de material de surf y clases en las mejores olas de Cantabria.',                                                                                                                                       phone: '685 200 115',                                           hours: 'Lun-Dom 10:00–19:00 (temporada)',                        tags: ['Alquiler', 'Material'] },
    { id: 'biz-074', name: 'Surf Camp - Ajo Natura',             category: 'surf',         subcategory: 'Surf Camp',      coords: [-3.6181195, 43.493516],   location: 'Ajo',                          desc: 'Campamento de surf con alojamiento, clases y actividades complementarias como longboard, voley playa y trekking.',                                                                                              phone: '942 670 600', website: 'https://ajonatura.com',         hours: 'Check-in Dom 17:00, Check-out Sab 11:00',               tags: ['Camp', 'Alojamiento', 'Multiactividad'] },
    { id: 'biz-075', name: 'Sea Playa',                          category: 'surf',         subcategory: 'Actividades acuáticas', coords: [-3.6159604, 43.494957], location: 'Ajo',                   desc: 'Centro de actividades acuaticas y deportes de playa.',                                                                                                                                                          hours: 'Lun-Dom 10:00–19:00 (verano)',                                                                                          tags: ['Acuaticas', 'Playa'] },
    { id: 'biz-076', name: 'Paintball Cabo de Ajo',              category: 'surf',         subcategory: 'Paintball',      coords: [-3.6036066, 43.4947196],  location: 'Ajo',                          desc: 'Campo de paintball con diferentes escenarios para grupos y despedidas.',                                                                                                                                         phone: '679 300 200',                                           hours: 'Sab-Dom 10:00–19:00 (reserva previa)',                   tags: ['Paintball', 'Grupos', 'Aventura'] },
    { id: 'biz-077', name: 'AFIT Private Center',                category: 'surf',         subcategory: 'Gimnasio',       coords: [-3.6167954, 43.4853218],  location: 'Ajo - Lurcia',                desc: 'Centro de fitness privado con entrenamiento personalizado.',                                                                                                                                                     hours: 'Lun-Vie 7:00–22:00, Sab 9:00–14:00',                                                                                    tags: ['Fitness', 'Personal'] },

    // -- SALUD --
    { id: 'biz-078', name: 'Farmacia Miriam Crespo',             category: 'salud',        subcategory: 'Farmacia',       coords: [-3.6124985, 43.4807718],  location: 'Ajo',                          desc: 'Farmacia de guardia con amplio surtido y atencion farmaceutica personalizada.',                                                                                                                                 phone: '942 670 096',                                           hours: 'Lun-Vie 9:30–14:00, 16:30–20:00, Sab 10:00–13:30',     tags: ['Farmacia', 'Guardia'] },
    { id: 'biz-079', name: 'La Botica',                          category: 'salud',        subcategory: 'Parafarmacia',   coords: [-3.6124223, 43.4787122],  location: 'Ajo',                          desc: 'Parafarmacia y herboristeria con productos naturales y de bienestar.',                                                                                                                                           hours: 'Lun-Vie 10:00–14:00, 17:00–20:00',                                                                                      tags: ['Natural', 'Bienestar'] },
    { id: 'biz-080', name: 'Consultorio de Ajo',                 category: 'salud',        subcategory: 'Centro médico',  coords: [-3.6108421, 43.4832343],  location: 'Ajo',                          desc: 'Consultorio medico publico del Servicio Cantabro de Salud.',                                                                                                                                                    phone: '942 670 014',                                           hours: 'Lun-Vie 8:00–15:00 (cita previa)',                       tags: ['Publico', 'Medico'] },
    { id: 'biz-081', name: 'Doctora Ma Jose Martinez de Anillo', category: 'salud',        subcategory: 'Consulta médica', coords: [-3.61455, 43.4776],       location: 'Ajo',                          desc: 'Consulta medica privada con atencion personalizada.',                                                                                                                                                           phone: '942 670 120',                                           hours: 'Con cita previa',                                        tags: ['Privado', 'Cita previa'] },
    { id: 'biz-082', name: 'Rosario Centro De Estetica',         category: 'salud',        subcategory: 'Centro de estética', coords: [-3.6130381, 43.4835301], location: 'Ajo',                       desc: 'Centro de estetica con tratamientos faciales, corporales y de belleza.',                                                                                                                                         phone: '942 670 430',                                           hours: 'Mar-Sab 10:00–14:00, 16:00–20:00',                      tags: ['Estetica', 'Belleza'] },
    { id: 'biz-083', name: 'Peluqueria Barberia Natalia',        category: 'salud',        subcategory: 'Peluquería',     coords: [-3.6121144, 43.481576],   location: 'Ajo',                          desc: 'Peluqueria unisex y barberia con servicios de corte, color y tratamientos capilares.',                                                                                                                           phone: '942 670 260',                                           hours: 'Mar-Sab 9:30–13:30, 16:00–20:00',                       tags: ['Peluqueria', 'Barberia'] },

    // -- SERVICIOS --
    { id: 'biz-084', name: 'Oficina De Turismo De Ajo',          category: 'servicios',    subcategory: 'Oficina de turismo', coords: [-3.6119153, 43.4793813], location: 'Ajo',                      desc: 'Informacion turistica oficial del municipio de Bareyo: mapas, rutas, alojamientos y actividades.',                                                                                                              phone: '942 670 073',                                           hours: 'Lun-Vie 10:00–14:00 (verano ampliado)',                  tags: ['Informacion', 'Turismo', 'Oficial'] },
    { id: 'biz-085', name: 'Banco Santander Agentes',            category: 'servicios',    subcategory: 'Banca',          coords: [-3.6119094, 43.479687],   location: 'Ajo',                          desc: 'Oficina de agentes del Banco Santander con cajero automatico.',                                                                                                                                                 phone: '942 670 175',                                           hours: 'Lun-Vie 8:30–14:00',                                    tags: ['Banco', 'Cajero'] },
    { id: 'biz-086', name: 'COLADA EXPRES AJO',                  category: 'servicios',    subcategory: 'Lavandería',     coords: [-3.6129916, 43.4831569],  location: 'Ajo',                          desc: 'Lavanderia autoservicio 24h, ideal para turistas y campistas.',                                                                                                                                                  hours: '24 horas (autoservicio)',                                                                                                tags: ['Lavanderia', '24h', 'Autoservicio'] },
    { id: 'biz-087', name: 'Inmobiliaria CRISSER',               category: 'servicios',    subcategory: 'Inmobiliaria',   coords: [-3.6119623, 43.4843211],  location: 'Ajo',                          desc: 'Agencia inmobiliaria con propiedades en venta y alquiler en Bareyo y alrededores.',                                                                                                                             phone: '942 670 450',                                           hours: 'Lun-Vie 10:00–14:00, 16:00–19:00',                      tags: ['Inmobiliaria', 'Alquiler'] },
    { id: 'biz-088', name: 'Fincas Diego',                       category: 'servicios',    subcategory: 'Inmobiliaria',   coords: [-3.6119756, 43.479914],   location: 'Ajo, Av. Benedicto Ruiz 444', desc: 'Agencia inmobiliaria especializada en propiedades en el municipio de Bareyo.',                                                                                                                                phone: '942 670 335',                                           hours: 'Lun-Vie 10:00–14:00, 16:30–19:30',                      tags: ['Inmobiliaria', 'Propiedades'] },
    { id: 'biz-089', name: 'Venta de gas Butano y Propano Cepsa', category: 'servicios',   subcategory: 'Suministro de gas', coords: [-3.6133055, 43.4859181], location: 'Ajo - Lurcia',               desc: 'Punto de venta y reparto de bombonas de butano y propano.',                                                                                                                                                     phone: '942 670 055',                                           hours: 'Lun-Vie 9:00–13:00, 16:00–19:00',                       tags: ['Gas', 'Butano'] },
    { id: 'biz-090', name: 'APM Automecanica Bareyo',            category: 'servicios',    subcategory: 'Taller mecánico', coords: [-3.5943932, 43.473793],   location: 'Bareyo',                       desc: 'Taller de reparacion de automoviles, bicicletas y otros vehiculos.',                                                                                                                                             phone: '942 621 130',                                           hours: 'Lun-Vie 8:30–13:30, 15:00–18:30',                       tags: ['Mecanica', 'Reparacion'] },
    { id: 'biz-091', name: 'Talleres Mazo, S.L.',                category: 'servicios',    subcategory: 'Taller',         coords: [-3.6018547, 43.4750901],  location: 'Ajo',                          desc: 'Taller mecanico de referencia en la zona con servicio integral de vehiculos.',                                                                                                                                  phone: '942 670 032',                                           hours: 'Lun-Vie 8:30–13:30, 15:00–18:30',                       tags: ['Taller', 'Mecanica'] },
    { id: 'biz-092', name: 'Taller Electrico Mazo S.L.U.',       category: 'servicios',    subcategory: 'Electricista',   coords: [-3.6045989, 43.4757553],  location: 'Ajo',                          desc: 'Instalaciones electricas, reparaciones y mantenimiento.',                                                                                                                                                       phone: '942 670 280',                                           hours: 'Lun-Vie 8:00–13:30, 15:00–18:00',                       tags: ['Electricidad', 'Instalaciones'] },
    { id: 'biz-093', name: 'Carpinteria Ebanisteria Carlos',     category: 'servicios',    subcategory: 'Carpintería',    coords: [-3.6163606, 43.4857821],  location: 'Ajo - Lurcia',                 desc: 'Carpinteria y ebanisteria artesanal, muebles a medida.',                                                                                                                                                        phone: '942 670 310',                                           hours: 'Lun-Vie 8:30–13:30, 15:00–18:30',                       tags: ['Carpinteria', 'Artesanal'] },
    { id: 'biz-094', name: 'Carpinteria Goyo',                   category: 'servicios',    subcategory: 'Carpintería',    coords: [-3.6167885, 43.4857309],  location: 'Ajo - Lurcia',                 desc: 'Carpinteria tradicional con trabajos en madera de calidad.',                                                                                                                                                    phone: '942 670 315',                                           hours: 'Lun-Vie 8:30–13:30, 15:00–18:30',                       tags: ['Carpinteria', 'Madera'] },
    { id: 'biz-095', name: 'Rusco Multiservicios',               category: 'servicios',    subcategory: 'Multiservicios', coords: [-3.597107, 43.469235],    location: 'Bareyo',                       desc: 'Empresa de multiservicios: reformas, mantenimiento y reparaciones del hogar.',                                                                                                                                  phone: '942 621 180',                                           hours: 'Lun-Vie 9:00–18:00',                                    tags: ['Reformas', 'Mantenimiento'] },
    { id: 'biz-096', name: 'Jardin de Infancia Casuca del Sauce', category: 'servicios',   subcategory: 'Guardería',      coords: [-3.6132916, 43.4791488],  location: 'Ajo',                          desc: 'Guarderia infantil con ambiente calido y actividades educativas.',                                                                                                                                               phone: '942 670 210',                                           hours: 'Lun-Vie 7:30–16:00',                                    tags: ['Guarderia', 'Infantil'] }
];

// ==================== WEATHER CODES ====================
const WMO_CODES = {
    0:  { desc: 'Despejado',                    icon: '☀️' },
    1:  { desc: 'Mayormente despejado',          icon: '🌤️' },
    2:  { desc: 'Parcialmente nublado',          icon: '⛅' },
    3:  { desc: 'Nublado',                       icon: '☁️' },
    45: { desc: 'Niebla',                        icon: '🌫️' },
    48: { desc: 'Niebla con escarcha',           icon: '🌫️' },
    51: { desc: 'Llovizna ligera',               icon: '🌦️' },
    53: { desc: 'Llovizna',                      icon: '🌦️' },
    55: { desc: 'Llovizna intensa',              icon: '🌧️' },
    61: { desc: 'Lluvia ligera',                 icon: '🌦️' },
    63: { desc: 'Lluvia',                        icon: '🌧️' },
    65: { desc: 'Lluvia intensa',                icon: '🌧️' },
    71: { desc: 'Nieve ligera',                  icon: '🌨️' },
    73: { desc: 'Nieve',                         icon: '🌨️' },
    75: { desc: 'Nieve intensa',                 icon: '❄️' },
    80: { desc: 'Chubascos',                     icon: '🌦️' },
    81: { desc: 'Chubascos fuertes',             icon: '🌧️' },
    82: { desc: 'Chubascos muy fuertes',         icon: '🌧️' },
    95: { desc: 'Tormenta',                      icon: '⛈️' },
    96: { desc: 'Tormenta con granizo',          icon: '⛈️' },
    99: { desc: 'Tormenta fuerte con granizo',   icon: '⛈️' }
};

// ==================== TRANSLATIONS ====================
const TRANSLATIONS = {
    es: {
        title:             'Descubre Bareyo',
        subtitle:          'Guia Interactiva',
        loading:           'Cargando guia de Bareyo...',
        routes:            'rutas',
        businesses:        'negocios',
        searchPlaceholder: 'Buscar ruta, negocio, iglesia, faro...',
        satellite:         'Satelite',
        terrain3d:         'Relieve 3D',
        agenda:            'Agenda',
        agendaHeader:      'Agenda · Ayuntamiento de Bareyo',
        eventReadOriginal: 'Ver original en aytobareyo.org →',
        eventsEmpty:       'Agenda no disponible ahora mismo.',
        beachFlag:         'Bandera de baño',
        flagGreen:         'Verde',
        flagYellow:        'Amarilla',
        flagRed:           'Roja',
        flagNone:          'Sin dato',
        flagLiveCam:       'Cámara en vivo',
        help:              'Ayuda',
        north:             'Norte',
        myLocation:        'Mi ubicacion',
        overview:          'Vista general',
        description:       'Descripcion',
        location:          'Ubicacion',
        contactInfo:       'Informacion de contacto',
        elevation:         'Perfil altimetrico',
        view3d:            'Vista 3D inmersiva',
        navigate:          'Como llegar',
        share:             'Compartir',
        call:              'Llamar',
        download:          'Descargar GPX',
        allCategories:     'Todos',
        results:           'resultados',
        today:             'Hoy',
        forecast:          'Proximos 7 dias',
        marineHeading:     'Mar y oleaje · Ajo',
        wavePeriod:        'Periodo',
        seaTemp:           'Temperatura del mar',
        waveDirection:     'Direccion oleaje',
        marineDisclaimer:  'Sin pleamar/bajamar (no uso nautico)',
        highTide:          'Pleamar',
        lowTide:           'Bajamar',
        tideNow:           'Ahora',
        tidesDisclaimer:   'Calculado (M2+S2) · No usar para nautica',
        darkMode:          'Oscuro',
        lightMode:         'Claro',
        themeToggle:       'Cambiar tema (claro/oscuro)',
        airQuality:        'Aire',
        grass:             'Gramineas',
        birch:             'Abedul',
        olive:             'Olivo',
        aqiVeryGood:       'Excelente',
        aqiGood:           'Bueno',
        aqiFair:           'Aceptable',
        aqiPoor:           'Regular',
        aqiBad:            'Malo',
        aqiVeryBad:        'Muy malo',
        pollenLow:         'Bajo',
        pollenMid:         'Moderado',
        pollenHigh:        'Alto',
        pollenVeryHigh:    'Muy alto',
        encyclopedia:      'Enciclopedia',
        wikiLoading:       'Cargando enciclopedia...',
        wikiEmpty:         'Sin extracto disponible en Wikipedia.',
        readMoreWiki:      'Leer mas en Wikipedia',
        listen:            'Escuchar',
        audioPlaying:      'Reproduciendo audio...',
        audioStopped:      'Audio detenido',
        audioUnsupported:  'El navegador no soporta sintesis de voz',
        install:           'Instalar',
        moreControls:      'Más',
        startRoute:        'Empezar ruta',
        finish:            'Finalizar',
        toNextPoint:       'al siguiente',
        geoUnsupported:    'Geolocalizacion no soportada',
        routeStarted:      'Ruta iniciada'
    },
    en: {
        title:             'Discover Bareyo',
        subtitle:          'Interactive Guide',
        loading:           'Loading Bareyo guide...',
        routes:            'routes',
        businesses:        'businesses',
        searchPlaceholder: 'Search route, business, church, lighthouse...',
        satellite:         'Satellite',
        terrain3d:         '3D Terrain',
        agenda:            'Events',
        agendaHeader:      'Events · Bareyo Town Hall',
        eventReadOriginal: 'Read original on aytobareyo.org →',
        eventsEmpty:       'No agenda available right now.',
        beachFlag:         'Bathing flag',
        flagGreen:         'Green',
        flagYellow:        'Yellow',
        flagRed:           'Red',
        flagNone:          'No data',
        flagLiveCam:       'Live camera',
        help:              'Help',
        north:             'North',
        myLocation:        'My location',
        overview:          'Overview',
        description:       'Description',
        location:          'Location',
        contactInfo:       'Contact information',
        elevation:         'Elevation profile',
        view3d:            'Immersive 3D view',
        navigate:          'Directions',
        share:             'Share',
        call:              'Call',
        download:          'Download GPX',
        allCategories:     'All',
        results:           'results',
        today:             'Today',
        forecast:          'Next 7 days',
        marineHeading:     'Sea & waves · Ajo',
        wavePeriod:        'Period',
        seaTemp:           'Sea temperature',
        waveDirection:     'Wave direction',
        marineDisclaimer:  'No high/low tide (not for nautical use)',
        highTide:          'High tide',
        lowTide:           'Low tide',
        tideNow:           'Now',
        tidesDisclaimer:   'Calculated (M2+S2) · Not for nautical use',
        darkMode:          'Dark',
        lightMode:         'Light',
        themeToggle:       'Toggle theme (light/dark)',
        airQuality:        'Air',
        grass:             'Grass',
        birch:             'Birch',
        olive:             'Olive',
        aqiVeryGood:       'Excellent',
        aqiGood:           'Good',
        aqiFair:           'Fair',
        aqiPoor:           'Moderate',
        aqiBad:            'Poor',
        aqiVeryBad:        'Very poor',
        pollenLow:         'Low',
        pollenMid:         'Moderate',
        pollenHigh:        'High',
        pollenVeryHigh:    'Very high',
        encyclopedia:      'Encyclopedia',
        wikiLoading:       'Loading encyclopedia...',
        wikiEmpty:         'No summary available on Wikipedia.',
        readMoreWiki:      'Read more on Wikipedia',
        listen:            'Listen',
        audioPlaying:      'Playing audio...',
        audioStopped:      'Audio stopped',
        audioUnsupported:  'Speech synthesis not supported in your browser',
        install:           'Install',
        moreControls:      'More',
        startRoute:        'Start route',
        finish:            'Finish',
        toNextPoint:       'to next',
        geoUnsupported:    'Geolocation not supported',
        routeStarted:      'Route started'
    },
    fr: {
        title:             'Decouvrir Bareyo',
        subtitle:          'Guide Interactif',
        loading:           'Chargement du guide de Bareyo...',
        routes:            'itineraires',
        businesses:        'commerces',
        searchPlaceholder: 'Chercher itineraire, commerce, eglise, phare...',
        satellite:         'Satellite',
        terrain3d:         'Relief 3D',
        agenda:            'Agenda',
        agendaHeader:      'Agenda · Mairie de Bareyo',
        eventReadOriginal: 'Voir l\'original sur aytobareyo.org →',
        eventsEmpty:       'Agenda indisponible pour le moment.',
        beachFlag:         'Drapeau de baignade',
        flagGreen:         'Vert',
        flagYellow:        'Jaune',
        flagRed:           'Rouge',
        flagNone:          'Sans donnée',
        flagLiveCam:       'Caméra en direct',
        help:              'Aide',
        north:             'Nord',
        myLocation:        'Ma position',
        overview:          'Vue generale',
        description:       'Description',
        location:          'Localisation',
        contactInfo:       'Coordonnees',
        elevation:         'Profil altimetrique',
        view3d:            'Vue 3D immersive',
        navigate:          'Itineraire',
        share:             'Partager',
        call:              'Appeler',
        download:          'Telecharger GPX',
        allCategories:     'Tous',
        results:           'resultats',
        today:             'Aujourd\'hui',
        forecast:          'Prochains 7 jours',
        marineHeading:     'Mer & houle · Ajo',
        wavePeriod:        'Periode',
        seaTemp:           'Temperature de la mer',
        waveDirection:     'Direction de la houle',
        marineDisclaimer:  'Pas de marees (usage non nautique)',
        highTide:          'Maree haute',
        lowTide:           'Maree basse',
        tideNow:           'Maintenant',
        tidesDisclaimer:   'Calcule (M2+S2) · Pas pour la nautique',
        darkMode:          'Sombre',
        lightMode:         'Clair',
        themeToggle:       'Changer le thème (clair/sombre)',
        airQuality:        'Air',
        grass:             'Graminees',
        birch:             'Bouleau',
        olive:             'Olivier',
        aqiVeryGood:       'Excellent',
        aqiGood:           'Bon',
        aqiFair:           'Moyen',
        aqiPoor:           'Mediocre',
        aqiBad:            'Mauvais',
        aqiVeryBad:        'Tres mauvais',
        pollenLow:         'Faible',
        pollenMid:         'Modere',
        pollenHigh:        'Eleve',
        pollenVeryHigh:    'Tres eleve',
        encyclopedia:      'Encyclopedie',
        wikiLoading:       'Chargement de l\'encyclopedie...',
        wikiEmpty:         'Pas de resume disponible sur Wikipedia.',
        readMoreWiki:      'Lire la suite sur Wikipedia',
        listen:            'Ecouter',
        audioPlaying:      'Lecture audio...',
        audioStopped:      'Audio arrete',
        audioUnsupported:  'Synthese vocale non supportee par le navigateur',
        install:           'Installer',
        moreControls:      'Plus',
        startRoute:        'Demarrer la randonnee',
        finish:            'Terminer',
        toNextPoint:       'au suivant',
        geoUnsupported:    'Geolocalisation non supportee',
        routeStarted:      'Randonnee demarree'
    },
    de: {
        title:             'Bareyo entdecken',
        subtitle:          'Interaktiver Reisefuhrer',
        loading:           'Bareyo-Reisefuhrer wird geladen...',
        routes:            'Routen',
        businesses:        'Geschafte',
        searchPlaceholder: 'Route, Geschaft, Kirche, Leuchtturm suchen...',
        satellite:         'Satellit',
        terrain3d:         '3D-Gelande',
        agenda:            'Termine',
        agendaHeader:      'Termine · Rathaus Bareyo',
        eventReadOriginal: 'Original auf aytobareyo.org ansehen →',
        eventsEmpty:       'Derzeit kein Programm verfugbar.',
        beachFlag:         'Badeflagge',
        flagGreen:         'Grun',
        flagYellow:        'Gelb',
        flagRed:           'Rot',
        flagNone:          'Keine Daten',
        flagLiveCam:       'Live-Kamera',
        help:              'Hilfe',
        north:             'Norden',
        myLocation:        'Mein Standort',
        overview:          'Ubersicht',
        description:       'Beschreibung',
        location:          'Standort',
        contactInfo:       'Kontaktinformationen',
        elevation:         'Hohenprofil',
        view3d:            'Immersive 3D-Ansicht',
        navigate:          'Route planen',
        share:             'Teilen',
        call:              'Anrufen',
        download:          'GPX herunterladen',
        allCategories:     'Alle',
        results:           'Ergebnisse',
        today:             'Heute',
        forecast:          'Nachste 7 Tage',
        marineHeading:     'Meer & Wellen · Ajo',
        wavePeriod:        'Periode',
        seaTemp:           'Meerestemperatur',
        waveDirection:     'Wellenrichtung',
        marineDisclaimer:  'Keine Gezeiten (nicht nautisch)',
        highTide:          'Hochwasser',
        lowTide:           'Niedrigwasser',
        tideNow:           'Jetzt',
        tidesDisclaimer:   'Berechnet (M2+S2) · Nicht fur Nautik',
        darkMode:          'Dunkel',
        lightMode:         'Hell',
        themeToggle:       'Thema wechseln (hell/dunkel)',
        airQuality:        'Luft',
        grass:             'Graser',
        birch:             'Birke',
        olive:             'Olive',
        aqiVeryGood:       'Ausgezeichnet',
        aqiGood:           'Gut',
        aqiFair:           'Massig',
        aqiPoor:           'Schlecht',
        aqiBad:            'Sehr schlecht',
        aqiVeryBad:        'Gefahrlich',
        pollenLow:         'Niedrig',
        pollenMid:         'Mittel',
        pollenHigh:        'Hoch',
        pollenVeryHigh:    'Sehr hoch',
        encyclopedia:      'Enzyklopadie',
        wikiLoading:       'Enzyklopadie wird geladen...',
        wikiEmpty:         'Kein Eintrag in Wikipedia verfugbar.',
        readMoreWiki:      'Mehr auf Wikipedia lesen',
        listen:            'Anhoren',
        audioPlaying:      'Audio wird abgespielt...',
        audioStopped:      'Audio gestoppt',
        audioUnsupported:  'Sprachausgabe vom Browser nicht unterstutzt',
        install:           'Installieren',
        moreControls:      'Mehr',
        startRoute:        'Route starten',
        finish:             'Beenden',
        toNextPoint:       'zum nachsten',
        geoUnsupported:    'Standortbestimmung nicht unterstutzt',
        routeStarted:      'Route gestartet'
    }
};

// Global language state (shared with app.js)
var currentLang = 'es';

function t(key) {
    return (TRANSLATIONS[currentLang] || TRANSLATIONS.es)[key] || (TRANSLATIONS.es)[key] || key;
}

// ==================== UTILS ====================
function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ==================== POI I18N (carteler\u00eda ES/EN/FR) ====================
// Traducciones de los POIs se\u00f1alizados (rutas + patrimonio/costa + 3D). ES con acentos
// correctos para carteler\u00eda de calidad; EN/FR generados por traductor profesional.
// Los 96 negocios permanecen en su ES de origen (entity.desc). localizeEntity() resuelve
// el idioma activo y cae a entity[field] si no hay traducci\u00f3n (p.ej. alem\u00e1n \u2192 ES).
const POI_I18N = {
    'bareyo-1': {
        es: { name: 'San Pedruco y Cabo Quintres', desc: 'Recorre destacados puntos hist\u00f3ricos y naturales como la Ermita de San Pedruco, el espectacular Cabo Quintres y varias casonas blasonadas del municipio.' },
        en: { name: 'San Pedruco & Cabo Quintres Headland', desc: 'Take in standout historic and natural landmarks such as the San Pedruco Hermitage, the spectacular Cabo Quintres headland and several armorial manor houses of the municipality.' },
        fr: { name: 'San Pedruco et Cap Quintres', desc: "Parcourez des sites historiques et naturels remarquables tels que l'ermitage de San Pedruco, le spectaculaire Cap Quintres et plusieurs maisons seigneuriales armori\u00e9es de la commune." }
    },
    'bareyo-2': {
        es: { name: 'Cabo y R\u00eda de Ajo', desc: 'Recorrido costero esencial que visita el emblem\u00e1tico Faro de Ajo, la sorprendente Cueva de la Ojerada y la R\u00eda de Ajo.' },
        en: { name: 'Cabo & R\u00eda de Ajo (Cape and Estuary)', desc: 'An essential coastal route taking in the iconic Faro de Ajo Lighthouse, the remarkable Cueva de la Ojerada cave and the R\u00eda de Ajo estuary.' },
        fr: { name: 'Cap et R\u00eda de Ajo', desc: "Un itin\u00e9raire c\u00f4tier incontournable qui passe par l'embl\u00e9matique Phare de Ajo, la surprenante grotte de la Ojerada et la R\u00eda de Ajo." }
    },
    'bareyo-3': {
        es: { name: 'Sta. Mar\u00eda de Bareyo y San Roque', desc: 'Ruta de patrimonio que incluye la Iglesia Santa Mar\u00eda de Bareyo (joya del rom\u00e1nico), el Molino de la Venera y la Ermita de San Roque.' },
        en: { name: 'Santa Mar\u00eda de Bareyo Church & San Roque Hermitage', desc: 'A heritage trail featuring the Church of Santa Mar\u00eda de Bareyo (a Romanesque gem), the Molino de la Venera mill and the San Roque Hermitage.' },
        fr: { name: 'Santa Mar\u00eda de Bareyo et San Roque', desc: "Un parcours patrimonial comprenant l'\u00e9glise Santa Mar\u00eda de Bareyo (joyau de l'art roman), le moulin de la Venera et l'ermitage de San Roque." }
    },
    'bareyo-4': {
        es: { name: 'Iglesia de San Vicente y San Juli\u00e1n', desc: 'Ruta jacobea que pasa por la Iglesia de San Vicente M\u00e1rtir, el Palacio de G\u00fcemes y el Hospital de peregrinos de San Juli\u00e1n.' },
        en: { name: 'Church of San Vicente & San Juli\u00e1n', desc: "A stretch of the Camino de Santiago that passes by the Church of San Vicente M\u00e1rtir, the Palacio de G\u00fcemes and the San Juli\u00e1n Pilgrims' Hospital." },
        fr: { name: '\u00c9glise de San Vicente et San Juli\u00e1n', desc: "Un itin\u00e9raire jacquaire qui passe par l'\u00e9glise de San Vicente M\u00e1rtir, le palais de G\u00fcemes et l'h\u00f4pital de p\u00e8lerins de San Juli\u00e1n." }
    },
    'bareyo-5': {
        es: { name: 'Ruta de las Iglesias', desc: 'Completo itinerario monumental que conecta el Palacio de Cubillas, las iglesias de San Vicente, Santa Mar\u00eda de Bareyo y San Mart\u00edn de Tours.' },
        en: { name: 'Ruta de las Iglesias (Churches Route)', desc: 'A comprehensive heritage itinerary linking the Palacio de Cubillas with the churches of San Vicente, Santa Mar\u00eda de Bareyo and San Mart\u00edn de Tours.' },
        fr: { name: 'Ruta de las Iglesias (Route des \u00c9glises)', desc: 'Un itin\u00e9raire monumental complet qui relie le palais de Cubillas et les \u00e9glises de San Vicente, Santa Mar\u00eda de Bareyo et San Mart\u00edn de Tours.' }
    },
    'faro-ajo': {
        es: { name: 'Faro de Ajo', desc: 'Emblemático faro del Cabo de Ajo, el último construido en Cantabria. Su torre, intervenida por Okuda San Miguel, es un lienzo de color frente al Cantábrico.' },
        en: { name: 'Faro de Ajo Lighthouse', desc: 'An iconic lighthouse at Cabo de Ajo, the last built in Cantabria. Its tower, reimagined by Okuda San Miguel, is a canvas of colour facing the Cantabrian Sea.' },
        fr: { name: 'Phare de Ajo', desc: "Phare emblématique du Cap de Ajo, le dernier construit en Cantabrie. Sa tour, revisitée par Okuda San Miguel, est une toile colorée face à la mer Cantabrique." }
    },
    'ria-ajo': {
        es: { name: 'R\u00eda de Ajo', desc: 'Un entorno natural privilegiado donde el r\u00edo Campiazo se encuentra con el mar Cant\u00e1brico.' },
        en: { name: 'R\u00eda de Ajo Estuary', desc: 'A privileged natural setting where the River Campiazo meets the Cantabrian Sea.' },
        fr: { name: 'R\u00eda de Ajo', desc: 'Un cadre naturel privil\u00e9gi\u00e9 o\u00f9 la rivi\u00e8re Campiazo rejoint la mer Cantabrique.' }
    },
    'playa-ajo': {
        es: { name: 'Playa de Ajo (Antuerta)', desc: 'Playa de fina arena rodeada de acantilados, ideal para el surf y el descanso.' },
        en: { name: 'Playa de Ajo Beach (Antuerta)', desc: 'A fine-sand beach framed by cliffs, perfect for surfing and unwinding.' },
        fr: { name: 'Plage de Ajo (Antuerta)', desc: 'Plage de sable fin entour\u00e9e de falaises, id\u00e9ale pour le surf et la d\u00e9tente.' }
    },
    'playa-cuberris': {
        es: { name: 'Playa de Cuberris', desc: 'La gran playa de Ajo: casi un kil\u00f3metro de arena dorada abierta al Cant\u00e1brico, muy popular para el surf y los paseos.' },
        en: { name: 'Cuberris Beach', desc: "Ajo's main beach: almost a kilometre of golden sand open to the Cantabrian Sea, popular for surfing and seaside walks." },
        fr: { name: 'Plage de Cuberris', desc: 'La grande plage de Ajo : pr\u00e8s d\u2019un kilom\u00e8tre de sable dor\u00e9 ouvert sur la mer Cantabrique, pris\u00e9e pour le surf et les promenades.' }
    },
    'ojerada': {
        es: { name: 'La Ojerada', desc: 'Ventanal natural de roca caliza con dos «ojos» horadados por el mar. Vistas espectaculares en el litoral protegido de Ajo, cerca del faro.' },
        en: { name: 'La Ojerada', desc: "A natural window of limestone rock with two 'eyes' bored by the sea. Spectacular views on the protected Ajo coast, near the lighthouse." },
        fr: { name: 'La Ojerada', desc: 'Fenêtre naturelle de roche calcaire percée de deux « yeux » par la mer. Vues spectaculaires sur la côte protégée d’Ajo, près du phare.' }
    },
    '3d-san-pedruco': {
        es: { name: 'Ermita de San Pedruco', desc: 'Pequeña ermita del s. XII con elementos románicos, recientemente restaurada.' },
        en: { name: 'San Pedruco Hermitage', desc: 'A small 12th-century hermitage with Romanesque features, recently restored.' },
        fr: { name: 'Ermitage de San Pedruco', desc: "Petit ermitage du XIIe siècle aux éléments romans, récemment restauré." }
    },
    '3d-sta-maria-bareyo': {
        es: { name: 'Santa María de Bareyo', desc: 'Joya del románico cántabro (finales s. XII) con cabecera trilobulada en forma de trébol. Capiteles esculpidos y pila bautismal con simbología medieval. Bien de Interés Cultural.' },
        en: { name: 'Santa María de Bareyo Church', desc: 'A gem of Cantabrian Romanesque (late 12th c.) with a rare trefoil-shaped chevet. Carved capitals and a baptismal font with medieval symbolism. Site of Cultural Interest.' },
        fr: { name: 'Santa María de Bareyo', desc: "Joyau de l'art roman cantabrique (fin XIIe s.) au chevet trilobé en forme de trèfle. Chapiteaux sculptés et fonts baptismaux à symbolique médiévale. Bien d'Intérêt Culturel." }
    },
    '3d-san-julian': {
        es: { name: 'Ermita de San Julián', desc: 'Antiguo hospital de peregrinos del Camino de la costa (s. XII-XIII), con huellas románicas en su fachada norte. Rehabilitada como Centro de Interpretación del Camino.' },
        en: { name: 'San Julián Hermitage', desc: "A former pilgrims' hospital on the coastal Camino de Santiago (12th–13th c.), with Romanesque traces on its north facade. Now the Camino Interpretation Centre." },
        fr: { name: 'Ermitage de San Julián', desc: "Ancien hôpital de pèlerins sur le Chemin de la côte (XIIe–XIIIe s.), aux traces romanes sur sa façade nord. Réhabilité en Centre d'interprétation du Chemin." }
    },
    '3d-san-vicente-guemes': {
        es: { name: 'Iglesia de San Vicente Mártir', desc: 'En el valle de Güemes, obra de canteros locales, guarda un retablo barroco de 1677 con columnas salomónicas presidido por la Virgen del Carmen.' },
        en: { name: 'Church of San Vicente Mártir', desc: 'In the Güemes valley, built by local stonemasons, it houses a 1677 Baroque altarpiece with Solomonic columns crowned by the Virgen del Carmen.' },
        fr: { name: 'Église de San Vicente Mártir', desc: "Dans la vallée de Güemes, œuvre de tailleurs de pierre locaux, elle abrite un retable baroque de 1677 aux colonnes salomoniques dominé par la Vierge du Carmel." }
    },
    '3d-san-martin-tours': {
        es: { name: 'Iglesia de San Martín de Tours', desc: 'Templo con más de mil años de historia, nacido como monasterio de San Juan de Asio. Planta-salón de bóvedas estrelladas con un retablo barroco de 1626 y cuatro capillas.' },
        en: { name: 'Church of San Martín de Tours', desc: 'A church with over a thousand years of history, born as the monastery of San Juan de Asio. A hall church with star vaults, a 1626 Baroque altarpiece and four chapels.' },
        fr: { name: 'Église de San Martín de Tours', desc: "Église plus que millénaire, née comme monastère de San Juan de Asio. Église-halle aux voûtes en étoile, retable baroque de 1626 et quatre chapelles." }
    },
    '3d-san-ildefonso': {
        es: { name: 'Convento de San Ildefonso', desc: 'Fundado en 1588 y proyectado por Diego de Sisniega, maestro ligado a El Escorial. Convento dominico y refugio de peregrinos, hoy Centro de Interpretación del Camino.' },
        en: { name: 'Convent of San Ildefonso', desc: 'Founded in 1588 and designed by Diego de Sisniega, a master linked to El Escorial. A Dominican convent and pilgrims’ refuge, now the Camino Interpretation Centre.' },
        fr: { name: 'Couvent de San Ildefonso', desc: "Fondé en 1588 et conçu par Diego de Sisniega, maître lié à l'Escurial. Couvent dominicain et refuge de pèlerins, aujourd'hui Centre d'interprétation du Chemin." }
    },
    'ermita-san-roque': {
        es: { name: 'Ermita de San Roque', desc: 'Sencilla ermita de 1602 en un alto con vistas al mar, donde confluyen Ajo, Bareyo y Güemes. Devoción popular a San Roque, patrón de peregrinos.' },
        en: { name: 'San Roque Hermitage', desc: 'A simple 1602 hermitage on a rise with sea views, where Ajo, Bareyo and Güemes meet. Popular devotion to San Roque, patron of pilgrims.' },
        fr: { name: 'Ermitage de San Roque', desc: "Modeste ermitage de 1602 sur une hauteur avec vue sur la mer, au point de rencontre d'Ajo, Bareyo et Güemes. Dévotion populaire à San Roque, patron des pèlerins." }
    }
};

// Devuelve el campo (name/desc) de una entidad en el idioma activo, con fallback a ES de origen.
function localizeEntity(entity, field) {
    if (!entity) return '';
    var lang = (typeof currentLang !== 'undefined') ? currentLang : 'es';
    var tr = POI_I18N[entity.id];
    if (tr && tr[lang] && tr[lang][field]) return tr[lang][field];
    return entity[field] || '';
}
