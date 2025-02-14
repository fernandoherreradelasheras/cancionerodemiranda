export const repoRoot = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/"
export const latestPdfsUrl = "https://cdm.humanoydivino.com/pdfs-release-latest.json"


export interface TonoDef {
  index: number;
  title: string;
  text_author: string;
  music_author: string;
  s1_pages: number[];
  s2_pages: number[];
  t_pages: number[];
  g_pages: number[];
  status_text_transcription: string;
  status_text_proof_reading: string;
  status_text_validation: string;
  status_music_transcription: string;
  status_music_proof_reading: string;
  status_music_validation: string;
  status_poetic_study: string;
  status_musical_study: string;
  introduction: string;
  mei_file: string;
  mei_unit: number;
  text_transcription: { file: string, type: string }[],
  text_comments_file: string;
  music_comments_file: string;
  path: string;
  pdf_url: string;
  number: number;
}

export const getJson = async (url: string) => {
  const response = await fetch(url)
  return response.json()
};


export const tonoDefinitions = [
    "01_-_Un_imposible_me_mata/def.json",
    "02_-_Querido_imposible_mio/def.json",
    "03_-_Amariles_yo_no_puedo/def.json",
    "04_-_Mas_merece_quien_mas_ama/def.json",
    "05_-_En_carroza_de_cristal/def.json",
    "06_-_Ojos,_yo_no_di_licencia/def.json",
    "07_-_A_donde_corres_arroyo/def.json",
    "08_-_Alarma_alarma_luceros/def.json",
    "09_-_La_belleza_de_Amariles/def.json",
    "10_-_Aquella_deidad_del_Tajo/def.json",
    "11_-_Ojos_bellos,_quien_ha_visto/def.json",
    "12_-_Filis_yo_por_ti_me_muero/def.json",
    "13_-_Celebrando_esta_el_amor/def.json",
    "14_-_Triste_tortola_en_quejas/def.json",
    "15_-_A_los_sonoros_encuentros/def.json",
    "16_-_Norabuena_venga_al_mundo/def.json",
    "17_-_Ha_del_mar,_ha_del_hermoso/def.json",
    "18_-_Divina_aurora_Alemana/def.json",
    "19_-_Perlas_iban_cogiendo/def.json",
    "20_-_Quien_dira_que_mi_destino/def.json",
    "21_-_En_pedazos_va_cayendo/def.json",
    "22_-_Quien_dira_que_tus_dos_niñas/def.json",
    "23_-_De_la_hermosura_de_Filis/def.json",
    "24_-_Una_fuente_se_despeña/def.json",
    "25_-_Campos_del_Tajo_Amariles/def.json",
    "26_-_Enternecido_un_peñasco/def.json",
    "27_-_Aflicto_corazón_mío/def.json",
    "28_-_Si_hay_iman_que_a_un_duro_acero/def.json",
    "29_-_Con_el_cantaro_Marica/def.json",
    "30_-_El_curso_transparente/def.json",
    "31_-_No_me_le_recuerde_el_aire/def.json",
    "32_-_Su_hielo_esgrimiendo_la_noche/def.json",
    "33_-_Helado_sol_en_llamas/def.json",
    "34_-_Pudieron_detenerle/def.json",
    "35_-_Abejuela_si_pretendes/def.json",
    "36_-_Deseos_de_un_imposible/def.json",
    "37_-_Dónde_volais,_pensamientos/def.json",
    "38_-_Al_compas_de_un_arroyuelo/def.json",
    "39_-_Que_fuertes_que_son_mis_penas/def.json",
    "40_-_Las_lagrimas_con_que_Lices/def.json",
    "41_-_Venturoso_y_rico_estoy_amor/def.json",
    "42_-_Ola,_tened_que_marica/def.json",
    "43_-_A_los_encuentros_del_aire/def.json",
    "44_-_Altiva_peña_respeitas/def.json",
    "45_-_Las_redes_sobre_la_arena/def.json",
    "46_-_Es_tan_inmortal_la_pena/def.json",
    "47_-_Que_valentones/def.json",
    "48_-_Salio_el_sol,_una_mañana/def.json",
    "49_-_Deseos_sin_esperanza/def.json",
    "50_-_Al_instrumento_sonoro/def.json",
    "51__-_Si_al_bosque_la_corte_va/def.json",
    "52_-_Venganza,_griegos_repite/def.json",
    "53_-_Mi_querida_hermosa_prenda/def.json",
    "54_-_Venid,_pastores_al_valle/def.json",
    "55_-_Como_a_mis_ojos_te_quiero/def.json",
    "56_-_Quien_ama_y_no_se_declara/def.json",
    "57_-_Soledades_importunas/def.json",
    "58_-_Escuchame_Fabio/def.json",
    "59_-_Enbarcome_la_esperanza/def.json",
    "60_-_Deidad,_que_divina_enseñas/def.json",
    "61_-_Huyendo_baja_un_arroyo/def.json",
    "62_-_Aquella_que_mis_males/def.json",
    "63_-_Que_bien_siente_Manzanares/def.json",
    "64_-_Que_me_quieres_ciego_niño/def.json",
    "65_-_Del_silencio_de_este_valle/def.json",
    "66_-_Para_vos_y_para_mi/def.json",
    "67_-_Sembrando_estaba_papeles/def.json",
    "68_-_Quien_ha_hecho_a_los_míos_ojos/def.json",
    "69_-_Ay_mensajero_que_envía/def.json",
    "70_-_Esperaba_en_su_barquilla/def.json",
    "71_-_En_ti_halle_querida_Filis/def.json",
    "72_-_Laurelia_del_alma_mía/def.json",
    "73_-_Junto_a_un_arroyo_de_plata/def.json",
    "74_-_Valgate_Dios_por_Jacinta/def.json",
    "75_-_Los_diamantes_de_la_noche/def.json",
    "76_-_Derramando_estaba_perlas/def.json",
    "77_-_Por_alegrar_la_mañana/def.json"
];
