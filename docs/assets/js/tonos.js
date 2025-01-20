

const repoRoot = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/";

const TEXT_TRANSCRIPTION = 'text_transcription';

const tonos = [
    { "definition": "01_-_Un_imposible_me_mata/def.json" },
    { "definition": "02_-_Querido_imposible_mio/def.json" },
    { "definition": "03_-_Amariles_yo_no_puedo/def.json" },
    { "definition": "04_-_Mas_merece_quien_mas_ama/def.json" },
    { "definition": "05_-_En_carroza_de_cristal/def.json" },
    { "definition": "06_-_Ojos,_yo_no_di_licencia/def.json" },
    { "definition": "07_-_A_donde_corres_arroyo/def.json" },
    { "definition": "08_-_Alarma_alarma_luceros/def.json" },
    { "definition": "09_-_La_belleza_de_Amariles/def.json" },
    { "definition": "10_-_Aquella_deidad_del_Tajo/def.json" },
    { "definition": "11_-_Ojos_bellos,_quien_ha_visto/def.json" },
    { "definition": "12_-_Filis_yo_por_ti_me_muero/def.json" },
    { "definition": "13_-_Celebrando_esta_el_amor/def.json" },
    { "definition": "14_-_Triste_tortola_en_quejas/def.json" },
    { "definition": "15_-_A_los_sonoros_encuentros/def.json" },
    { "definition": "16_-_Norabuena_venga_al_mundo/def.json" },
    { "definition": "17_-_Ha_del_mar,_ha_del_hermoso/def.json" },
    { "definition": "18_-_Divina_aurora_Alemana/def.json" },
    { "definition": "19_-_Perlas_iban_cogiendo/def.json" },
    { "definition": "20_-_Quien_dira_que_mi_destino/def.json" },
    { "definition": "21_-_En_pedazos_va_cayendo/def.json" },
    { "definition": "22_-_Quien_dira_que_tus_dos_niñas/def.json" },
    { "definition": "23_-_De_la_hermosura_de_Filis/def.json" },
    { "definition": "24_-_Una_fuente_se_despeña/def.json" },
    { "definition": "25_-_Campos_del_Tajo_Amariles/def.json" },
    { "definition": "26_-_Enternecido_un_peñasco/def.json" },
    { "definition": "27_-_Aflicto_corazón_mío/def.json" },
    { "definition": "28_-_Si_hay_iman_que_a_un_duro_acero/def.json" },
    { "definition": "29_-_Con_el_cantaro_Marica/def.json" },
    { "definition": "30_-_El_curso_transparente/def.json" },
    { "definition": "31_-_No_me_le_recuerde_el_aire/def.json" },
    { "definition": "32_-_Su_hielo_esgrimiendo_la_noche/def.json" },
    { "definition": "33_-_Helado_sol_en_llamas/def.json" },
    { "definition": "34_-_Pudieron_detenerle/def.json" },
    { "definition": "35_-_Abejuela_si_pretendes/def.json" },
    { "definition": "36_-_Deseos_de_un_imposible/def.json" },
    { "definition": "37_-_Dónde_volais,_pensamientos/def.json" },
    { "definition": "38_-_Al_compas_de_un_arroyuelo/def.json" },
    { "definition": "39_-_Que_fuertes_que_son_mis_penas/def.json" },
    { "definition": "40_-_Las_lagrimas_con_que_Lices/def.json" },
    { "definition": "41_-_Venturoso_y_rico_estoy_amor/def.json" },
    { "definition": "42_-_Ola,_tened_que_marica/def.json" },
    { "definition": "43_-_A_los_encuentros_del_aire/def.json" },
    { "definition": "44_-_Altiva_peña_respeitas/def.json" },
    { "definition": "45_-_Las_redes_sobre_la_arena/def.json" },
    { "definition": "46_-_Es_tan_inmortal_la_pena/def.json" },
    { "definition": "47_-_Que_valentones/def.json" },
    { "definition": "48_-_Salio_el_sol,_una_mañana/def.json" },
    { "definition": "49_-_Deseos_sin_esperanza/def.json" },
    { "definition": "50_-_Al_instrumento_sonoro/def.json" },
    { "definition": "51__-_Si_al_bosque_la_corte_va/def.json" },
    { "definition": "52_-_Venganza,_griegos_repite/def.json" },
    { "definition": "53_-_Mi_querida_hermosa_prenda/def.json" },
    { "definition": "54_-_Venid,_pastores_al_valle/def.json" },
    { "definition": "55_-_Como_a_mis_ojos_te_quiero/def.json" },
    { "definition": "56_-_Quien_ama_y_no_se_declara/def.json" },
    { "definition": "57_-_Soledades_importunas/def.json" },
    { "definition": "58_-_Escuchame_Fabio/def.json" },
    { "definition": "59_-_Enbarcome_la_esperanza/def.json" },
    { "definition": "60_-_Deidad,_que_divina_enseñas/def.json" },
    { "definition": "61_-_Huyendo_baja_un_arroyo/def.json" },
    { "definition": "62_-_Aquella_que_mis_males/def.json" },
    { "definition": "63_-_Que_bien_siente_Manzanares/def.json" },
    { "definition": "64_-_Que_me_quieres_ciego_niño/def.json" },
    { "definition": "65_-_Del_silencio_de_este_valle/def.json" },
    { "definition": "66_-_Para_vos_y_para_mi/def.json" },
    { "definition": "67_-_Sembrando_estaba_papeles/def.json" },
    { "definition": "68_-_Quien_ha_hecho_a_los_míos_ojos/def.json" },
    { "definition": "69_-_Ay_mensajero_que_envía/def.json" },
    { "definition": "70_-_Esperaba_en_su_barquilla/def.json" },
    { "definition": "71_-_En_ti_halle_querida_Filis/def.json" },
    { "definition": "72_-_Laurelia_del_alma_mía/def.json" },
    { "definition": "73_-_Junto_a_un_arroyo_de_plata/def.json" },
    { "definition": "74_-_Valgate_Dios_por_Jacinta/def.json" },
    { "definition": "75_-_Los_diamantes_de_la_noche/def.json" },
    { "definition": "76_-_Derramando_estaba_perlas/def.json" },
    { "definition": "77_-_Por_alegrar_la_mañana/def.json" }
];






async function getTonoData(path) {
    const fileUrl = encodeURI(repoRoot + 'tonos/' + path);
    console.log(fileUrl);
    return fetch(fileUrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            return json
        });
}


function tonoOveralStatus(tono) {
    allStatuses = [
        "status_text_transcription",
        "status_text_proof_reading",
        "status_text_validation",
        "status_music_transcription",
        "status_music_proof_reading",
        "status_music_validation",
        "status_poetic_study",
        "status_musical_study"
    ];
    let completed = allStatuses.filter(x => tono[x] == "completed");
    if (completed.length == allStatuses.length) {
        return ["completed", "item-completed"];
    }
    let started = allStatuses.filter(x => tono[x] != "not started");
    if (started.length > 0) {
        return ["in progress", "item-in-progress"];
    }

    return ["not started", "item-not-started"];
}

function statusStarted(status) {
    return (status == "in progress" || status == "completed");
}

function tonoHasMusic(tono) {
    return (statusStarted(tono['status_music_transcription']) && tono['mei_file'] != undefined && tono['mei_file'] != '');
}

function tonoHasText(tono) {
    return (statusStarted(tono['status_text_transcription']) &&
        tono[TEXT_TRANSCRIPTION] != undefined && tono[TEXT_TRANSCRIPTION] != '')
}




