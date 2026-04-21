#!/usr/bin/env python3
"""
HYPR TV Map — Fixture Generator
Creates public/assets/tv/stations.json and retransmitters.json from a
hand-curated list of major Brazilian TV generators (TVD).

The list covers the 5 major networks (Globo, SBT, Record, Band, RedeTV!)
across the most relevant Brazilian TV markets, plus key secondary
networks (Cultura, TV Brasil, Gazeta, Rede Vida, Canção Nova).

Data sources:
  - Affiliate lists maintained by each network (public)
  - Anatel Plano Básico de TVD (physical channels)
  - Approximate antenna coordinates (usually the municipal center offset
    toward the historical broadcast tower location)

Until scripts/etl_anatel_tv.py is wired up to pull the authoritative
Anatel Mosaico data, this fixture is what populates stations.json.

Usage: python scripts/generate-tv-fixture.py
"""

import json
import os
from datetime import date

OUT_DIR = "public/assets/tv"

# Each row: (tipo, municipio, uf, canal_fisico, canal_virtual, erp_kw,
#            altura_m, entidade, rede_id, nome_fantasia, status, lat, lng)
STATIONS = [
    # SÃO PAULO (capital)
    ("TVD", "São Paulo", "SP", "13", "5.1", 88.0, 360, "Globo Comunicação e Participações S.A.", "globo", "TV Globo São Paulo", "Licenciada", -23.4569, -46.7622),
    ("TVD", "São Paulo", "SP", "18", "4.1", 52.0, 315, "TV SBT Canal 4 de São Paulo S.A.", "sbt", "SBT São Paulo", "Licenciada", -23.4571, -46.7625),
    ("TVD", "São Paulo", "SP", "22", "7.1", 46.0, 340, "Rádio e Televisão Record S.A.", "record", "Record TV São Paulo", "Licenciada", -23.4576, -46.7628),
    ("TVD", "São Paulo", "SP", "28", "13.1", 40.0, 330, "Rádio e Televisão Bandeirantes Ltda.", "band", "Band São Paulo", "Licenciada", -23.4580, -46.7620),
    ("TVD", "São Paulo", "SP", "36", "9.1", 28.0, 310, "Rede TV S.A.", "redetv", "RedeTV! São Paulo", "Licenciada", -23.4583, -46.7618),
    ("TVD", "São Paulo", "SP", "25", "2.1", 35.0, 305, "Fundação Padre Anchieta", "cultura", "TV Cultura", "Licenciada", -23.4578, -46.7615),
    ("TVD", "São Paulo", "SP", "26", "11.1", 18.0, 280, "Fundação Casper Líbero", "gazeta", "TV Gazeta", "Licenciada", -23.4585, -46.7610),
    ("TVD", "São Paulo", "SP", "27", "21.1", 16.0, 290, "Rede Vida de Televisão", "rit", "Rede Vida", "Licenciada", -23.4582, -46.7612),
    ("TVD", "São Paulo", "SP", "29", "53.1", 20.0, 295, "Fundação João Paulo II", "cancao", "Canção Nova", "Licenciada", -23.4579, -46.7616),
    ("TVD", "São Paulo", "SP", "30", "2.2", 12.0, 275, "Empresa Brasil de Comunicação S/A", "tvbrasil", "TV Brasil SP", "Licenciada", -23.4574, -46.7623),

    # SÃO PAULO (interior)
    ("TVD", "Campinas", "SP", "21", "7.1", 18.0, 180, "EPTV Campinas Ltda.", "globo", "EPTV Campinas", "Licenciada", -22.9056, -47.0608),
    ("TVD", "Campinas", "SP", "25", "5.1", 12.0, 170, "TV SBT Campinas", "sbt", "TV Thathi", "Licenciada", -22.9060, -47.0612),
    ("TVD", "Ribeirão Preto", "SP", "22", "3.1", 15.0, 165, "EPTV Ribeirão Preto Ltda.", "globo", "EPTV Ribeirão Preto", "Licenciada", -21.1704, -47.8019),
    ("TVD", "São José do Rio Preto", "SP", "18", "6.1", 12.0, 150, "TV TEM São José do Rio Preto", "globo", "TV TEM Rio Preto", "Licenciada", -20.8197, -49.3795),
    ("TVD", "Sorocaba", "SP", "17", "4.1", 14.0, 155, "TV TEM Sorocaba Ltda.", "globo", "TV TEM Sorocaba", "Licenciada", -23.5015, -47.4526),
    ("TVD", "Bauru", "SP", "15", "8.1", 12.0, 145, "TV TEM Bauru Ltda.", "globo", "TV TEM Bauru", "Licenciada", -22.3246, -49.0871),
    ("TVD", "Presidente Prudente", "SP", "14", "11.1", 10.0, 130, "TV Fronteira Ltda.", "globo", "TV Fronteira", "Licenciada", -22.1276, -51.3862),
    ("TVD", "Araraquara", "SP", "13", "4.1", 10.0, 135, "TV Morada do Sol", "sbt", "TV Morada do Sol", "Licenciada", -21.7946, -48.1756),
    ("TVD", "Santos", "SP", "16", "12.1", 15.0, 160, "TV Globo Santos Ltda.", "globo", "TV Tribuna", "Licenciada", -23.9608, -46.3336),
    ("TVD", "São José dos Campos", "SP", "14", "9.1", 12.0, 170, "TV Vanguarda Paulista", "globo", "TV Vanguarda", "Licenciada", -23.2237, -45.9009),

    # RIO DE JANEIRO
    ("TVD", "Rio de Janeiro", "RJ", "15", "4.1", 60.0, 290, "Globo Comunicação e Participações S.A.", "globo", "TV Globo Rio de Janeiro", "Licenciada", -22.9306, -43.2509),
    ("TVD", "Rio de Janeiro", "RJ", "21", "5.1", 40.0, 285, "TV SBT Canal 5 do Rio de Janeiro S.A.", "sbt", "SBT Rio", "Licenciada", -22.9310, -43.2513),
    ("TVD", "Rio de Janeiro", "RJ", "32", "7.1", 38.0, 280, "Record TV Rio de Janeiro S.A.", "record", "Record TV Rio", "Licenciada", -22.9308, -43.2511),
    ("TVD", "Rio de Janeiro", "RJ", "34", "13.1", 32.0, 275, "Rádio e Televisão Bandeirantes Ltda.", "band", "Band Rio", "Licenciada", -22.9312, -43.2515),
    ("TVD", "Rio de Janeiro", "RJ", "36", "9.1", 25.0, 270, "Rede TV Rio S.A.", "redetv", "RedeTV! Rio", "Licenciada", -22.9315, -43.2518),
    ("TVD", "Rio de Janeiro", "RJ", "25", "2.1", 20.0, 265, "TVE Brasil", "tvbrasil", "TV Brasil Rio", "Licenciada", -22.9314, -43.2517),
    ("TVD", "Nova Friburgo", "RJ", "16", "4.1", 8.0, 120, "TV Zoom Ltda.", "globo", "Inter TV Serra+Mar", "Licenciada", -22.2819, -42.5311),
    ("TVD", "Campos dos Goytacazes", "RJ", "14", "7.1", 10.0, 130, "Inter TV dos Campos", "globo", "Inter TV Planície", "Licenciada", -21.7545, -41.3244),
    ("TVD", "Volta Redonda", "RJ", "15", "12.1", 12.0, 140, "TV Rio Sul", "globo", "TV Rio Sul", "Licenciada", -22.5202, -44.0996),

    # MINAS GERAIS
    ("TVD", "Belo Horizonte", "MG", "17", "12.1", 50.0, 220, "TV Globo Minas Ltda.", "globo", "TV Globo Minas", "Licenciada", -19.9317, -43.9317),
    ("TVD", "Belo Horizonte", "MG", "24", "5.1", 22.0, 210, "TV Alterosa S.A.", "sbt", "TV Alterosa", "Licenciada", -19.9320, -43.9320),
    ("TVD", "Belo Horizonte", "MG", "30", "7.1", 18.0, 215, "Record TV Minas Ltda.", "record", "Record TV Minas", "Licenciada", -19.9315, -43.9315),
    ("TVD", "Belo Horizonte", "MG", "32", "13.1", 15.0, 205, "TV Bandeirantes Minas", "band", "Band Minas", "Licenciada", -19.9318, -43.9319),
    ("TVD", "Belo Horizonte", "MG", "28", "9.1", 12.0, 200, "RedeTV! Minas Ltda.", "redetv", "RedeTV! Minas", "Licenciada", -19.9316, -43.9316),
    ("TVD", "Juiz de Fora", "MG", "14", "10.1", 12.0, 150, "TV Panorama Ltda.", "globo", "TV Integração JF", "Licenciada", -21.7617, -43.3494),
    ("TVD", "Uberlândia", "MG", "17", "8.1", 14.0, 155, "TV Paranaíba Ltda.", "globo", "TV Integração Uberlândia", "Licenciada", -18.9186, -48.2772),
    ("TVD", "Uberaba", "MG", "15", "10.1", 10.0, 145, "TV Integração Uberaba", "globo", "TV Integração Uberaba", "Licenciada", -19.7483, -47.9319),
    ("TVD", "Varginha", "MG", "16", "4.1", 9.0, 140, "EPTV Sul de Minas", "globo", "EPTV Sul de Minas", "Licenciada", -21.5513, -45.4300),
    ("TVD", "Governador Valadares", "MG", "13", "6.1", 10.0, 135, "Inter TV dos Vales Ltda.", "globo", "Inter TV dos Vales", "Licenciada", -18.8510, -41.9495),
    ("TVD", "Montes Claros", "MG", "14", "6.1", 10.0, 140, "Inter TV Grande Minas", "globo", "Inter TV Grande Minas", "Licenciada", -16.7282, -43.8578),
    ("TVD", "Poços de Caldas", "MG", "18", "7.1", 8.0, 130, "EPTV Poços de Caldas", "globo", "EPTV Poços de Caldas", "Licenciada", -21.7902, -46.5622),

    # DISTRITO FEDERAL
    ("TVD", "Brasília", "DF", "17", "10.1", 25.0, 195, "TV Globo Brasília Ltda.", "globo", "TV Globo Brasília", "Licenciada", -15.7906, -47.8919),
    ("TVD", "Brasília", "DF", "13", "2.1", 20.0, 185, "Empresa Brasil de Comunicação S/A", "tvbrasil", "TV Brasil", "Licenciada", -15.7910, -47.8920),
    ("TVD", "Brasília", "DF", "19", "4.1", 15.0, 190, "SBT Brasília", "sbt", "SBT Brasília", "Licenciada", -15.7908, -47.8921),
    ("TVD", "Brasília", "DF", "21", "7.1", 14.0, 188, "Record TV Brasília", "record", "Record TV Brasília", "Licenciada", -15.7909, -47.8922),
    ("TVD", "Brasília", "DF", "23", "13.1", 12.0, 186, "Band Brasília", "band", "Band Brasília", "Licenciada", -15.7911, -47.8923),

    # RIO GRANDE DO SUL
    ("TVD", "Porto Alegre", "RS", "14", "12.1", 32.0, 240, "Sociedade Rádio Televisão Gaúcha S.A.", "globo", "RBS TV Porto Alegre", "Licenciada", -30.0728, -51.1731),
    ("TVD", "Porto Alegre", "RS", "21", "5.1", 20.0, 230, "TV SBT Canal 5 de Porto Alegre", "sbt", "SBT Rio Grande", "Licenciada", -30.0730, -51.1735),
    ("TVD", "Porto Alegre", "RS", "28", "7.1", 18.0, 225, "Record TV RS S.A.", "record", "Record TV RS", "Licenciada", -30.0732, -51.1729),
    ("TVD", "Porto Alegre", "RS", "30", "13.1", 16.0, 220, "Band RS Ltda.", "band", "Band RS", "Licenciada", -30.0731, -51.1733),
    ("TVD", "Porto Alegre", "RS", "32", "9.1", 14.0, 215, "RedeTV! RS Ltda.", "redetv", "RedeTV! RS", "Licenciada", -30.0729, -51.1732),
    ("TVD", "Caxias do Sul", "RS", "15", "10.1", 12.0, 170, "RBS TV Caxias do Sul", "globo", "RBS TV Caxias", "Licenciada", -29.1685, -51.1787),
    ("TVD", "Santa Maria", "RS", "13", "12.1", 10.0, 150, "RBS TV Santa Maria", "globo", "RBS TV Santa Maria", "Licenciada", -29.6842, -53.8069),
    ("TVD", "Pelotas", "RS", "16", "6.1", 10.0, 140, "RBS TV Pelotas", "globo", "RBS TV Pelotas", "Licenciada", -31.7654, -52.3376),
    ("TVD", "Passo Fundo", "RS", "14", "7.1", 9.0, 135, "RBS TV Passo Fundo", "globo", "RBS TV Passo Fundo", "Licenciada", -28.2628, -52.4066),

    # PARANÁ
    ("TVD", "Curitiba", "PR", "15", "12.1", 25.0, 200, "RPC TV Curitiba Ltda.", "globo", "RPC Curitiba", "Licenciada", -25.4048, -49.2578),
    ("TVD", "Curitiba", "PR", "22", "5.1", 15.0, 195, "TV Iguaçu Ltda.", "sbt", "TV Iguaçu", "Licenciada", -25.4050, -49.2580),
    ("TVD", "Curitiba", "PR", "26", "7.1", 14.0, 190, "Record TV Paraná", "record", "Record TV Paraná", "Licenciada", -25.4049, -49.2582),
    ("TVD", "Curitiba", "PR", "28", "13.1", 12.0, 185, "Band Curitiba", "band", "Band Curitiba", "Licenciada", -25.4051, -49.2583),
    ("TVD", "Londrina", "PR", "17", "3.1", 15.0, 170, "RPC TV Londrina Ltda.", "globo", "RPC Londrina", "Licenciada", -23.3045, -51.1696),
    ("TVD", "Maringá", "PR", "15", "6.1", 12.0, 165, "RPC TV Maringá Ltda.", "globo", "RPC Maringá", "Licenciada", -23.4273, -51.9386),
    ("TVD", "Cascavel", "PR", "13", "9.1", 12.0, 160, "RPC TV Cascavel", "globo", "RPC Cascavel", "Licenciada", -24.9578, -53.4595),
    ("TVD", "Foz do Iguaçu", "PR", "14", "4.1", 10.0, 145, "RPC TV Foz do Iguaçu", "globo", "RPC Foz", "Licenciada", -25.5478, -54.5882),
    ("TVD", "Ponta Grossa", "PR", "16", "10.1", 10.0, 150, "RPC TV Ponta Grossa", "globo", "RPC Ponta Grossa", "Licenciada", -25.0950, -50.1619),

    # SANTA CATARINA
    ("TVD", "Florianópolis", "SC", "17", "12.1", 20.0, 125, "TV Barriga Verde Ltda.", "globo", "NSC TV Florianópolis", "Licenciada", -27.5954, -48.5480),
    ("TVD", "Florianópolis", "SC", "23", "4.1", 12.0, 120, "SBT Santa Catarina", "sbt", "SBT SC", "Licenciada", -27.5956, -48.5482),
    ("TVD", "Florianópolis", "SC", "25", "7.1", 10.0, 118, "Record TV SC", "record", "Record TV SC", "Licenciada", -27.5958, -48.5484),
    ("TVD", "Joinville", "SC", "15", "12.1", 14.0, 145, "NSC TV Joinville", "globo", "NSC TV Joinville", "Licenciada", -26.3044, -48.8487),
    ("TVD", "Blumenau", "SC", "13", "5.1", 12.0, 140, "NSC TV Blumenau", "globo", "NSC TV Blumenau", "Licenciada", -26.9194, -49.0661),
    ("TVD", "Chapecó", "SC", "16", "6.1", 10.0, 135, "NSC TV Chapecó", "globo", "NSC TV Chapecó", "Licenciada", -27.0963, -52.6182),
    ("TVD", "Criciúma", "SC", "14", "9.1", 10.0, 130, "NSC TV Criciúma", "globo", "NSC TV Criciúma", "Licenciada", -28.6775, -49.3697),

    # BAHIA
    ("TVD", "Salvador", "BA", "15", "11.1", 28.0, 180, "TV Bahia S.A.", "globo", "TV Bahia", "Licenciada", -12.9704, -38.5015),
    ("TVD", "Salvador", "BA", "22", "4.1", 20.0, 175, "TV Aratu S.A.", "sbt", "TV Aratu", "Licenciada", -12.9706, -38.5018),
    ("TVD", "Salvador", "BA", "30", "7.1", 18.0, 170, "Record TV Itapoan S.A.", "record", "Record TV Itapoan", "Licenciada", -12.9702, -38.5013),
    ("TVD", "Salvador", "BA", "32", "13.1", 15.0, 165, "Band Bahia", "band", "Band Bahia", "Licenciada", -12.9708, -38.5020),
    ("TVD", "Feira de Santana", "BA", "14", "5.1", 10.0, 130, "TV Subaé", "sbt", "TV Subaé", "Licenciada", -12.2669, -38.9663),
    ("TVD", "Ilhéus", "BA", "13", "11.1", 10.0, 125, "TV Santa Cruz", "globo", "TV Santa Cruz", "Licenciada", -14.7890, -39.0491),
    ("TVD", "Vitória da Conquista", "BA", "16", "11.1", 10.0, 135, "TV Sudoeste", "globo", "TV Sudoeste", "Licenciada", -14.8619, -40.8445),
    ("TVD", "Juazeiro", "BA", "15", "4.1", 9.0, 125, "TV Grande Rio", "globo", "TV Grande Rio", "Licenciada", -9.4158, -40.5027),

    # PERNAMBUCO
    ("TVD", "Recife", "PE", "17", "12.1", 25.0, 165, "TV Globo Nordeste Ltda.", "globo", "TV Globo Nordeste", "Licenciada", -8.0109, -34.9300),
    ("TVD", "Recife", "PE", "24", "4.1", 18.0, 160, "TV Jornal do Commercio Ltda.", "sbt", "TV Jornal", "Licenciada", -8.0111, -34.9302),
    ("TVD", "Recife", "PE", "26", "7.1", 15.0, 155, "Record TV Pernambuco", "record", "Record TV Pernambuco", "Licenciada", -8.0113, -34.9304),
    ("TVD", "Recife", "PE", "28", "13.1", 12.0, 150, "Band Pernambuco", "band", "Band Pernambuco", "Licenciada", -8.0115, -34.9306),
    ("TVD", "Caruaru", "PE", "13", "12.1", 10.0, 130, "TV Asa Branca", "globo", "TV Asa Branca", "Licenciada", -8.2824, -35.9766),
    ("TVD", "Petrolina", "PE", "14", "4.1", 10.0, 125, "TV Grande Rio Petrolina", "globo", "TV Grande Rio Petrolina", "Licenciada", -9.3891, -40.5030),

    # CEARÁ
    ("TVD", "Fortaleza", "CE", "15", "10.1", 22.0, 155, "TV Verdes Mares Ltda.", "globo", "TV Verdes Mares", "Licenciada", -3.7429, -38.5433),
    ("TVD", "Fortaleza", "CE", "22", "4.1", 16.0, 150, "TV Diário Ltda.", "sbt", "TV Cidade", "Licenciada", -3.7431, -38.5435),
    ("TVD", "Fortaleza", "CE", "26", "7.1", 14.0, 145, "TV Ceará", "record", "TV Ceará", "Licenciada", -3.7432, -38.5437),
    ("TVD", "Fortaleza", "CE", "28", "13.1", 12.0, 140, "Band Ceará", "band", "Band Ceará", "Licenciada", -3.7433, -38.5438),
    ("TVD", "Juazeiro do Norte", "CE", "14", "11.1", 10.0, 125, "TV Verdes Mares Cariri", "globo", "TV Verdes Mares Cariri", "Licenciada", -7.2157, -39.3154),
    ("TVD", "Sobral", "CE", "13", "2.1", 8.0, 115, "TV Verdes Mares Sobral", "globo", "TV Verdes Mares Sobral", "Licenciada", -3.6864, -40.3496),

    # GOIÁS
    ("TVD", "Goiânia", "GO", "13", "10.1", 20.0, 145, "TV Anhanguera Ltda.", "globo", "TV Anhanguera", "Licenciada", -16.6799, -49.2550),
    ("TVD", "Goiânia", "GO", "18", "4.1", 12.0, 140, "TV Serra Dourada", "sbt", "TV Serra Dourada", "Licenciada", -16.6801, -49.2552),
    ("TVD", "Goiânia", "GO", "21", "7.1", 10.0, 138, "Record TV Goiás", "record", "Record TV Goiás", "Licenciada", -16.6803, -49.2553),
    ("TVD", "Anápolis", "GO", "15", "12.1", 10.0, 130, "TV Anhanguera Anápolis", "globo", "TV Anhanguera Anápolis", "Licenciada", -16.3281, -48.9534),
    ("TVD", "Rio Verde", "GO", "14", "4.1", 8.0, 120, "TV Anhanguera Rio Verde", "globo", "TV Anhanguera Rio Verde", "Licenciada", -17.7977, -50.9303),

    # NORTE
    ("TVD", "Belém", "PA", "13", "2.1", 18.0, 140, "TV Liberal Ltda.", "globo", "TV Liberal", "Licenciada", -1.4558, -48.4902),
    ("TVD", "Belém", "PA", "18", "4.1", 12.0, 135, "SBT Pará", "sbt", "SBT Pará", "Licenciada", -1.4560, -48.4904),
    ("TVD", "Belém", "PA", "21", "7.1", 10.0, 132, "Record TV Belém", "record", "Record TV Belém", "Licenciada", -1.4562, -48.4906),
    ("TVD", "Santarém", "PA", "14", "8.1", 8.0, 110, "TV Tapajós", "globo", "TV Tapajós", "Licenciada", -2.4429, -54.7082),
    ("TVD", "Marabá", "PA", "13", "12.1", 8.0, 115, "TV SBT Marabá", "sbt", "TV SBT Marabá", "Licenciada", -5.3686, -49.1175),

    ("TVD", "Manaus", "AM", "16", "5.1", 18.0, 135, "Rede Amazônica de Rádio e Televisão Ltda.", "globo", "Rede Amazônica Manaus", "Licenciada", -3.1190, -60.0217),
    ("TVD", "Manaus", "AM", "22", "4.1", 14.0, 130, "TV A Crítica", "sbt", "TV A Crítica", "Licenciada", -3.1192, -60.0219),
    ("TVD", "Manaus", "AM", "26", "7.1", 12.0, 128, "Record TV Amazonas", "record", "Record TV Amazonas", "Licenciada", -3.1194, -60.0221),
    ("TVD", "Parintins", "AM", "13", "5.1", 6.0, 95, "Rede Amazônica Parintins", "globo", "Rede Amazônica Parintins", "Licenciada", -2.6277, -56.7350),

    ("TVD", "Porto Velho", "RO", "13", "5.1", 12.0, 95, "Rede Amazônica Porto Velho", "globo", "Rede Amazônica PV", "Licenciada", -8.7612, -63.9039),
    ("TVD", "Porto Velho", "RO", "17", "4.1", 8.0, 92, "SBT Rondônia", "sbt", "SBT Rondônia", "Licenciada", -8.7614, -63.9041),
    ("TVD", "Ji-Paraná", "RO", "14", "5.1", 7.0, 85, "Rede Amazônica Ji-Paraná", "globo", "Rede Amazônica Ji-Paraná", "Licenciada", -10.8854, -61.9517),

    ("TVD", "Rio Branco", "AC", "13", "5.1", 10.0, 90, "Rede Amazônica Acre", "globo", "Rede Amazônica AC", "Licenciada", -9.9747, -67.8243),
    ("TVD", "Rio Branco", "AC", "15", "4.1", 7.0, 85, "SBT Acre", "sbt", "SBT Acre", "Licenciada", -9.9749, -67.8245),

    ("TVD", "Macapá", "AP", "13", "6.1", 10.0, 90, "TV Amapá Ltda.", "globo", "TV Equinócio", "Licenciada", 0.0349, -51.0694),
    ("TVD", "Macapá", "AP", "15", "10.1", 7.0, 85, "TV Tropical Amapá", "sbt", "TV Tropical", "Licenciada", 0.0351, -51.0696),

    ("TVD", "Boa Vista", "RR", "13", "10.1", 8.0, 85, "Rede Amazônica Roraima", "globo", "Rede Amazônica RR", "Licenciada", 2.8235, -60.6758),
    ("TVD", "Boa Vista", "RR", "16", "5.1", 6.0, 80, "TV Imperial Roraima", "sbt", "TV Imperial", "Licenciada", 2.8237, -60.6760),

    # MATO GROSSO / MS / TO
    ("TVD", "Cuiabá", "MT", "13", "2.1", 15.0, 120, "Centro América Radiodifusão Ltda.", "globo", "TV Centro América", "Licenciada", -15.6014, -56.0979),
    ("TVD", "Cuiabá", "MT", "18", "4.1", 10.0, 115, "TV Cidade Verde", "sbt", "TV Cidade Verde", "Licenciada", -15.6016, -56.0981),
    ("TVD", "Rondonópolis", "MT", "14", "10.1", 9.0, 105, "TV Centro América Rondonópolis", "globo", "TV Centro América Rondonópolis", "Licenciada", -16.4673, -54.6372),
    ("TVD", "Sinop", "MT", "15", "7.1", 8.0, 100, "TV Centro América Sinop", "globo", "TV Centro América Sinop", "Licenciada", -11.8609, -55.5095),

    ("TVD", "Campo Grande", "MS", "13", "6.1", 16.0, 130, "TV Morena Ltda.", "globo", "TV Morena", "Licenciada", -20.4697, -54.6201),
    ("TVD", "Campo Grande", "MS", "17", "4.1", 10.0, 125, "SBT MS", "sbt", "SBT MS", "Licenciada", -20.4699, -54.6203),
    ("TVD", "Dourados", "MS", "14", "7.1", 9.0, 115, "TV Morena Dourados", "globo", "TV Morena Dourados", "Licenciada", -22.2232, -54.8120),

    ("TVD", "Palmas", "TO", "14", "10.1", 12.0, 95, "TV Anhanguera Tocantins Ltda.", "globo", "TV Anhanguera TO", "Licenciada", -10.1689, -48.3317),
    ("TVD", "Araguaína", "TO", "13", "5.1", 8.0, 90, "TV Anhanguera Araguaína", "globo", "TV Anhanguera Araguaína", "Licenciada", -7.1915, -48.2076),
    ("TVD", "Gurupi", "TO", "15", "7.1", 7.0, 85, "TV Anhanguera Gurupi", "globo", "TV Anhanguera Gurupi", "Licenciada", -11.7283, -49.0689),

    # ESPÍRITO SANTO
    ("TVD", "Vitória", "ES", "13", "4.1", 18.0, 120, "TV Gazeta Ltda.", "globo", "TV Gazeta ES", "Licenciada", -20.3155, -40.3128),
    ("TVD", "Vitória", "ES", "17", "5.1", 12.0, 115, "TV Vitória", "record", "TV Vitória", "Licenciada", -20.3157, -40.3130),
    ("TVD", "Vitória", "ES", "21", "7.1", 10.0, 110, "TV Tribuna ES", "sbt", "TV Tribuna ES", "Licenciada", -20.3159, -40.3132),
    ("TVD", "Cachoeiro de Itapemirim", "ES", "14", "6.1", 9.0, 105, "TV Gazeta Sul", "globo", "TV Gazeta Sul", "Licenciada", -20.8494, -41.1127),
    ("TVD", "Linhares", "ES", "15", "12.1", 8.0, 100, "TV Gazeta Norte", "globo", "TV Gazeta Norte", "Licenciada", -19.3946, -40.0721),

    # ALAGOAS / PB / RN / PI / SE / MA
    ("TVD", "Maceió", "AL", "13", "5.1", 15.0, 108, "TV Gazeta de Alagoas Ltda.", "globo", "TV Gazeta AL", "Licenciada", -9.6658, -35.7353),
    ("TVD", "Maceió", "AL", "16", "4.1", 10.0, 105, "TV Pajuçara", "sbt", "TV Pajuçara", "Licenciada", -9.6660, -35.7355),
    ("TVD", "Maceió", "AL", "20", "7.1", 9.0, 102, "Record TV Alagoas", "record", "Record TV Alagoas", "Licenciada", -9.6662, -35.7357),
    ("TVD", "Arapiraca", "AL", "14", "12.1", 7.0, 95, "TV Ponta Verde", "sbt", "TV Ponta Verde", "Licenciada", -9.7521, -36.6613),

    ("TVD", "João Pessoa", "PB", "15", "10.1", 15.0, 115, "TV Cabo Branco Ltda.", "globo", "TV Cabo Branco", "Licenciada", -7.1195, -34.8450),
    ("TVD", "João Pessoa", "PB", "18", "4.1", 10.0, 110, "TV Tambaú", "sbt", "TV Tambaú", "Licenciada", -7.1197, -34.8452),
    ("TVD", "João Pessoa", "PB", "22", "7.1", 9.0, 108, "TV Manaíra", "record", "TV Manaíra", "Licenciada", -7.1199, -34.8454),
    ("TVD", "Campina Grande", "PB", "13", "10.1", 10.0, 105, "TV Paraíba", "globo", "TV Paraíba", "Licenciada", -7.2291, -35.8813),

    ("TVD", "Natal", "RN", "14", "6.1", 14.0, 110, "Inter TV Cabugi Ltda.", "globo", "Inter TV Cabugi", "Licenciada", -5.7945, -35.2110),
    ("TVD", "Natal", "RN", "18", "4.1", 10.0, 108, "TV Ponta Negra", "sbt", "TV Ponta Negra", "Licenciada", -5.7947, -35.2112),
    ("TVD", "Natal", "RN", "22", "7.1", 9.0, 105, "Record TV Natal", "record", "Record TV Natal", "Licenciada", -5.7949, -35.2114),
    ("TVD", "Mossoró", "RN", "13", "6.1", 8.0, 100, "Inter TV Cabugi Mossoró", "globo", "Inter TV Costa Branca", "Licenciada", -5.1878, -37.3449),

    ("TVD", "Teresina", "PI", "13", "8.1", 12.0, 100, "TV Clube de Teresina Ltda.", "globo", "TV Clube Teresina", "Licenciada", -5.0892, -42.8019),
    ("TVD", "Teresina", "PI", "17", "4.1", 10.0, 98, "TV Meio Norte", "sbt", "TV Meio Norte", "Licenciada", -5.0894, -42.8021),
    ("TVD", "Teresina", "PI", "21", "7.1", 9.0, 95, "Rede Meio Norte Record", "record", "Record TV PI", "Licenciada", -5.0896, -42.8023),
    ("TVD", "Parnaíba", "PI", "14", "8.1", 7.0, 90, "TV Cidade Verde PI", "globo", "TV Cidade Verde PI", "Licenciada", -2.9038, -41.7767),

    ("TVD", "Aracaju", "SE", "13", "4.1", 14.0, 105, "TV Sergipe Ltda.", "globo", "TV Sergipe", "Licenciada", -10.9472, -37.0731),
    ("TVD", "Aracaju", "SE", "17", "5.1", 10.0, 100, "TV Atalaia", "sbt", "TV Atalaia", "Licenciada", -10.9474, -37.0733),
    ("TVD", "Aracaju", "SE", "21", "7.1", 9.0, 98, "Record TV Sergipe", "record", "Record TV Sergipe", "Licenciada", -10.9476, -37.0735),

    ("TVD", "São Luís", "MA", "13", "10.1", 14.0, 110, "TV Mirante Ltda.", "globo", "TV Mirante", "Licenciada", -2.5391, -44.2829),
    ("TVD", "São Luís", "MA", "18", "4.1", 10.0, 105, "TV Difusora", "sbt", "TV Difusora", "Licenciada", -2.5393, -44.2831),
    ("TVD", "São Luís", "MA", "22", "7.1", 9.0, 102, "TV Guará", "record", "TV Guará", "Licenciada", -2.5395, -44.2833),
    ("TVD", "Imperatriz", "MA", "14", "10.1", 10.0, 100, "TV Mirante Imperatriz", "globo", "TV Mirante Imperatriz", "Licenciada", -5.5185, -47.4776),
    ("TVD", "Caxias", "MA", "15", "7.1", 8.0, 95, "TV Mirante Caxias", "globo", "TV Mirante Caxias", "Licenciada", -4.8651, -43.3500),
]


FIELDS = [
    "tipo", "municipio", "uf", "canal", "canal_virtual",
    "erp_kw", "altura_antena",
    "entidade", "rede_id", "nome_fantasia", "status",
    "lat", "lng",
]

LOOKUP_KEYS = [
    "T", "M", "U", "C", "V",
    None, None,
    "E", "R", "F", "S",
    None, None,
]


def build_compact(rows):
    lookups = {k: [] for k in set(filter(None, LOOKUP_KEYS))}
    lookup_idx = {k: {} for k in lookups.keys()}

    data = []
    for row in rows:
        compact = []
        for value, key in zip(row, LOOKUP_KEYS):
            if key is None:
                compact.append(value)
            else:
                s = str(value) if value is not None else ""
                if s not in lookup_idx[key]:
                    lookup_idx[key][s] = len(lookups[key])
                    lookups[key].append(s)
                compact.append(lookup_idx[key][s])
        data.append(compact)

    return {
        "_meta": {
            "generated": date.today().isoformat(),
            "source": "fixture/manual-curation",
            "count": len(rows),
        },
        "_L": lookups,
        "_D": data,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    generators_compact = build_compact(STATIONS)
    out_stations = os.path.join(OUT_DIR, "stations.json")
    with open(out_stations, "w", encoding="utf-8") as f:
        json.dump(generators_compact, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ Wrote {len(STATIONS)} generators to {out_stations}")

    empty_compact = build_compact([])
    empty_compact["_meta"]["source"] = "fixture/empty"
    out_rtv = os.path.join(OUT_DIR, "retransmitters.json")
    with open(out_rtv, "w", encoding="utf-8") as f:
        json.dump(empty_compact, f, ensure_ascii=False, separators=(",", ":"))
    print(f"✓ Wrote empty RTV fixture to {out_rtv}")


if __name__ == "__main__":
    main()
