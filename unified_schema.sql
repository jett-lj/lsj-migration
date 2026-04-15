-- ============================================================
-- UNIFIED CATTLE DATABASE SCHEMA
-- Generated from all client databases
-- Total tables: 765
-- ============================================================

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Agistment_Transfer_Register] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Movement_Date] DATETIME NULL,
    [Agist_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Agistor_Code] SMALLINT NULL,
    [Numb_Head] SMALLINT NULL,
    [Numb_Died] SMALLINT NULL,
    [WBridge_Docket] VARCHAR(6) NULL,
    [Return_Wght] INT NULL,
    [Weight_cattle_Sent] INT NULL,
    [Agist_Weight_Gain] INT NULL,
    [WeightGain_$perKg] MONEY NULL  -- in 33/34 clients,
    [WeightGain_$/Kg] MONEY NULL  -- in 1/34 clients,
    [Inv_Number] VARCHAR(10) NULL  -- in 33/34 clients,
    [Inv_Amount] MONEY NULL  -- in 33/34 clients,
    [Agist_Inv_Approved] DATETIME NULL  -- in 33/34 clients,
    [Carrier] VARCHAR(25) NULL  -- in 33/34 clients,
    [Carrier_Inv_No] VARCHAR(10) NULL  -- in 33/34 clients,
    [Freight_Amount] MONEY NULL  -- in 33/34 clients,
    [Frght_Inv_Approved] DATETIME NULL  -- in 33/34 clients,
    [Applied_To_Cattle_File] BIT NOT NULL  -- in 33/34 clients,
    [Notes] NTEXT NULL  -- in 33/34 clients,
    [Agistor_TailTag] VARCHAR(10) NULL  -- in 33/34 clients,
    [Vendor_Decl_Numb] VARCHAR(10) NULL  -- in 33/34 clients,
    [Custom_FL_Returns] BIT NOT NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_Agistment_Transfer_Register] PRIMARY KEY ([ID])
);

-- Table found in 32 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Archiving_Log] (
    [Date_done] DATETIME NULL,
    [Reverse_Archive] BIT NULL,
    [Record_Selection] NTEXT NULL  -- types seen: NTEXT, NVARCHAR(250), NVARCHAR(500),
    [Records_Archived] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Archiving_Log] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Autopsy_Records] (
    [SB_Rec_No] INT NOT NULL,
    [Ear_Tag_No] VARCHAR(8) NOT NULL,
    [Date_Dead] DATETIME NULL,
    [Time_Dead] VARCHAR(10) NULL,
    [Time_Autopsy] VARCHAR(5) NULL,
    [Autopsy_By] VARCHAR(15) NULL,
    [Body_Cond_Fresh] BIT NOT NULL,
    [Body_Cond_Bloated] BIT NOT NULL,
    [Body_Cond_Putrid] BIT NOT NULL,
    [Pre_Autopsy_Diag] VARCHAR(50) NULL,
    [Nostrils_Erosions] BIT NOT NULL,
    [Nostrils_Fluid] BIT NOT NULL,
    [Nostrils_Froth] BIT NOT NULL,
    [Larynx_Normal] BIT NOT NULL,
    [Larynx_Necrotic] BIT NOT NULL,
    [Trachea_Erosions] BIT NOT NULL,
    [Tarchea_Fluid] BIT NOT NULL,
    [Trachea_Froth] BIT NOT NULL,
    [Chest_Fluid] BIT NOT NULL,
    [Chest_Fibrin] BIT NOT NULL,
    [Chest_Adhesions] BIT NOT NULL,
    [Lungs_Spongy] BIT NOT NULL,
    [Lungs_Firm] BIT NOT NULL,
    [Lungs_Consolidate] BIT NOT NULL,
    [Lungs_Abscess] BIT NOT NULL,
    [Lungs_not_Collapsed] BIT NOT NULL,
    [Heart_Fluid] BIT NOT NULL,
    [Heart_Haemorrhages] BIT NOT NULL,
    [Abdomen_Fluid] BIT NOT NULL,
    [Abdomen_Fibrin] BIT NOT NULL,
    [Abdomen_Adhesions] BIT NOT NULL,
    [Liver_Abscess] BIT NOT NULL,
    [Liver_Cysts] BIT NOT NULL,
    [Liver_Colour] BIT NOT NULL,
    [Rumen_Full] BIT NOT NULL,
    [Rumen_Empty] BIT NOT NULL,
    [Intest_Normal] BIT NOT NULL,
    [Intest_Red] BIT NOT NULL,
    [Intest_Dark] BIT NOT NULL,
    [Kidneys_Abscess] BIT NOT NULL,
    [Kidneys_Cyst] BIT NOT NULL,
    [Kidneys_Calculi] BIT NOT NULL,
    [Bladder_Intact] BIT NOT NULL,
    [Bladder_Ruptured] BIT NOT NULL,
    [Bladder_Calculi] BIT NOT NULL,
    [Muscle_Bruising] BIT NOT NULL,
    [Muscle_Abscess] BIT NOT NULL,
    [Legs_Bruising] BIT NOT NULL,
    [Legs_Abscess] BIT NOT NULL,
    [Notes] NTEXT NULL,
    [Beast_ID] INT NOT NULL,
    [Post_Autopsy_Diag] VARCHAR(50) NULL  -- in 29/34 clients,
    [Date_Autopsy] DATETIME NULL  -- in 28/34 clients
    ,CONSTRAINT [PK_Autopsy_Records] PRIMARY KEY ([SB_Rec_No])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Batch_Update_log] (
    [Date_done] DATETIME NOT NULL,
    [Username] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [UserID] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Logtext] NTEXT NULL  -- types seen: NTEXT, NVARCHAR(750),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Batch_Update_log] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2DE] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2DE] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser3] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser4] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser4] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser5] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser5] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BatchUpdate_Keyfile_2deuser6] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_2deuser6] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_accounts] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_accounts] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_ACCOUNTS_LAPTOP] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_ACCOUNTS_LAPTOP] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_ACCOUNTS_PC] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_ACCOUNTS_PC] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Admin] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_admin1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_admin1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_admin2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_admin2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_admin3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_admin3] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_ADMIN_LAPTOP] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_ADMIN_LAPTOP] PRIMARY KEY ([ID])
);

-- Table found in 9 client(s): 2DE, Barmount, Bos Grazing, Conargo Feedlot, Demonstration Database, Hutchinson Grazing, Lowlands Pastoral Co, Thomas Foods, Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Administrator] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Administrator] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_adminlocal] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_adminlocal] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_AdminOffice] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_AFSQL] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AFSQL] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_ameliabarry] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_amy] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_amy] PRIMARY KEY ([ID])
);

-- Table found in 3 client(s): Moruya Feedlot, Reid River Export, Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_AndrewConaghan] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AndrewConaghan] PRIMARY KEY ([ID])
);

-- Table found in 6 client(s): AAMIG, Conargo Feedlot, KO Beef, Lowlands Pastoral Co, Moruya Feedlot, Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_ANDREWS_DESKTOP] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 3 client(s): Coggan Agriculture, Conargo Feedlot, Penna & Sons
CREATE TABLE [BatchUpdate_Keyfile_ANDREWS_LAPTOP] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_ANDREWS_LAPTOP] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_AnnabelTudor] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AnnabelTudor] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_arose] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_arose] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_ASSTOFFICE] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_AULOWDSK00207] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_AUWMBDSK00325] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_AUWMBDSK00381] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_AVONDALE_CRUSH] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AVONDALE_CRUSH] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_AVONDALE_CRUSH2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AVONDALE_CRUSH2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_AVONDALE_CRUSH3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_AVONDALE_CRUSH3] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_BARSVR01] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_BARSVR01] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_biancathorn] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_BOSGRAZING] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_BOSGRAZING] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser3] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser4] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser4] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser5] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser5] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser6] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser6] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BatchUpdate_Keyfile_bosgrazinguser7] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bosgrazinguser7] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_bottomhospital] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bottomhospital] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_BSlaterA] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_BSlaterA] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_BSNTRADING] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_BSNTRADING] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_bsntradinguser1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bsntradinguser1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_bsntradinguser2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bsntradinguser2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_bsntradinguser3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bsntradinguser3] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_bsntradinguser4] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bsntradinguser4] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BatchUpdate_Keyfile_bsntradinguser5] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_bsntradinguser5] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_CadelgaServer] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_CadelgaServer] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_cattle] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_cattle] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_CattleRamp] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_CattleRamp] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_CF_RDS01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_CF_TS] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): CH2 Pastoral
CREATE TABLE [BatchUpdate_Keyfile_CH2PASTORAL] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_CLAY] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_CLAY_PC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_COATES_PC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_COATESFUJIADMIN] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Coggan Agriculture
CREATE TABLE [BatchUpdate_Keyfile_COGG_PC_0001] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_COGG_PC_0001] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_conaghana] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_conaghana] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP2] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Moruya Feedlot
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_145PN42] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_384TGM2] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_7AN36N4] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): CH2 Pastoral
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_AV5U0RU] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Mirambee Livestock
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_AVGECIM] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_CRP5RVV] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_D70ASNM] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_FDKFPCS] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_GEJSVEN] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_DESKTOP_PQ94RN3] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_diana] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_diana] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_DIGISTAR] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_egreed] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_egreed] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Willow Bend Feedlot
CREATE TABLE [BatchUpdate_Keyfile_ERIC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Feed] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Feed] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BatchUpdate_Keyfile_FEED_LOT] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_Feeding] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Feeding] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Llanarth Pastoral Co, Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_Feedlot] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Feedlot] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_FEEDLOT1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_Feedlot2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Feedlot2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_FeedShed] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_FeedShed] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_FMS_SVR] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_FMS_SVR] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_fryerm] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_fryerm] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BatchUpdate_Keyfile_GAIL_LAPTOP] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_hannah] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hannah] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_HO_LVSTK_BEEF] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_HO_LVSTK_BEEF] PRIMARY KEY ([ID])
);

-- Table found in 3 client(s): Cadelga Cattle Co, Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Hospital] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Hospital] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_hospital2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hospital2] PRIMARY KEY ([ID])
);

-- Table found in 6 client(s): Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Myrtlevale Partnership, Semini, Tonkin Farming
CREATE TABLE [BatchUpdate_Keyfile_HPDESKTOP] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BatchUpdate_Keyfile_HUTCHINSON] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_HUTCHINSON] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BatchUpdate_Keyfile_hutchinsonuser1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hutchinsonuser1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BatchUpdate_Keyfile_hutchinsonuser2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hutchinsonuser2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BatchUpdate_Keyfile_hutchinsonuser3] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hutchinsonuser3] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BatchUpdate_Keyfile_hutchinsonuser4] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_hutchinsonuser4] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_induction] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_jackbrumley] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_James] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_Jason] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Jason] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_Jedd] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Jedd] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_JENNY] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_Josh] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Josh] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Myrtlevale Partnership
CREATE TABLE [BatchUpdate_Keyfile_JULIEREID_PC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_KathreneAsturias] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_KathreneAsturias] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS02] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS03] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS04] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS05] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS06] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS07] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KO_WS6538] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_KOBEEF] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser2] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser3] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser4] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser5] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser6] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser7] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_kobeefuser8] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_laceyeccles] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Moruya Feedlot
CREATE TABLE [BatchUpdate_Keyfile_LAPTOP_2JJ7S2SO] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BatchUpdate_Keyfile_LAPTOP_6DJ6VE8K] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_LAPTOP_MACSF6QC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Livestock] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Livestock] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_LLANARTH] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_llanarthuser1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_llanarthuser2] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_llanarthuser3] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_llanarthuser4] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_llanarthuser5] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_lmcculloch] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_lmcculloch] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_loader] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_loader] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BatchUpdate_Keyfile_louisemartelloni] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_LyniseConaghan] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_LyniseConaghan] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_marney] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_marney] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_marybethjarloyan] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_matthewwooster] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_Maureen] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Maureen] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_mbinch] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_mbinch] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_Melissa] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Melissa] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_MelissaKenny] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_MelissaKenny] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Mirambee Livestock
CREATE TABLE [BatchUpdate_Keyfile_MFL_WKS01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_MichaelSwain] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_Mill] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Mill] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_MKruschel] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_MKruschel] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_MKruschelA] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_MKruschelA] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Barmount, KO Beef
CREATE TABLE [BatchUpdate_Keyfile_Office] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Office] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_OFFICE4] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_pburns] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_pburns] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_pburnsa] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_pburnsa] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_Penrider] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Penrider] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_penriders] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_PhilConaghan] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_PhilConaghan] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BatchUpdate_Keyfile_PossumGully] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): P&C and D&G Tuohey
CREATE TABLE [BatchUpdate_Keyfile_PROBOOK_470G1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_Process] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Process] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_RammieYlagan] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RammieYlagan] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_Ramp] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Ramp] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Barmount
CREATE TABLE [BatchUpdate_Keyfile_ReganConaghan] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_ReganConaghan] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Remote] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Remote] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_REPORTS] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_REPORTS] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_RichardC] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RichardC] PRIMARY KEY ([ID])
);

-- Table found in 3 client(s): Conargo Feedlot, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_RichardConibear] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RichardConibear] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_RRD_HPPD_01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_RRED_W01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_RRED_W02] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_RRED_W03] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_RRSERVER] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP41] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP41] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP45] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP45] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP46] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP46] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP47] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP47] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP50] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP50] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP51] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP51] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP53] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP53] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP55] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP55] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP56] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP56] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP57] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP57] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP65] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP65] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP66] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP66] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVDESKTOP67] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVDESKTOP67] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP40] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP40] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP64] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP64] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP66] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP66] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP68] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP68] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP70] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP70] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVLAPTOP74] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVLAPTOP74] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_RVSVR05] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_RVSVR05] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_sbsloader] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_sbsloader] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BatchUpdate_Keyfile_SCF_COW_NB03] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BatchUpdate_Keyfile_SCF_COW_WS02] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_schmidtw] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_schmidtw] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_seanfarrell] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_SERVER] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_SERVER] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BatchUpdate_Keyfile_shannonokeeffe] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_shaunbeard] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_shed] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_shed] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_slacka] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_slacka] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_slackm] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_slackm] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_SmithA] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_SmithA] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_SmithR] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_SmithR] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_Stephen] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Stephen] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_strkj] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_strkj] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BatchUpdate_Keyfile_SUPERVISORPC] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_SUPERVISORPC] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BatchUpdate_Keyfile_tamarawaterman] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_TArmfield] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TArmfield] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_TESSA_LAPTOP] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TESSA_LAPTOP] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BatchUpdate_Keyfile_TessaConaghan] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TessaConaghan] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BatchUpdate_Keyfile_TF01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_TFI_ADL_D06] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TFI_ADL_D06] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_TFI_ADL_D08] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TFI_ADL_D08] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BatchUpdate_Keyfile_TFI_ADL_D16] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TFI_ADL_D16] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BatchUpdate_Keyfile_theresacraig] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_THINK1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BatchUpdate_Keyfile_TNE_W01] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TNE_W01] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BatchUpdate_Keyfile_TNEPastorial] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TNEPastorial] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BatchUpdate_Keyfile_TONKINREPORTS] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BatchUpdate_Keyfile_TONKINTB01] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_TopHospital] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_TopHospital] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BatchUpdate_Keyfile_TRENT] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Kerrigan Valley Feedlot
CREATE TABLE [BatchUpdate_Keyfile_TREVOR_LT] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Kerrigan Valley Feedlot
CREATE TABLE [BatchUpdate_Keyfile_TREVOR_NB] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BatchUpdate_Keyfile_USER_PC] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_VHLFeed] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_VHLFeed] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_VHLTS] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_VHLTS] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BatchUpdate_Keyfile_vhlyards] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_vhlyards] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BatchUpdate_Keyfile_Weighbridge] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Weighbridge] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_WF_RDS] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_WF_RDS] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BatchUpdate_Keyfile_WilliamsonC] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_WilliamsonC] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Willow Bend Feedlot
CREATE TABLE [BatchUpdate_Keyfile_WILLOWBEND] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 6 client(s): Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, KO Beef, Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Yards] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_Yards] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BatchUpdate_Keyfile_YL_RDS01] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_YL_RDS01] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zav1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zbj1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zbj1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zbm2] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zbm2] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zcl1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zcl1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zdm1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zdm1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zes1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zfs1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zjg1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zjs1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 2 client(s): Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zkh1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zkh1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zmd1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zmr1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zpm1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zpm1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zrc1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_Zre1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zrn1] (
    [BeastID] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_BatchUpdate_Keyfile_zrn1] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BatchUpdate_Keyfile_zsb1] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_Accumed_Feed_by_commodity] (
    [BeastID] INT NOT NULL,
    [Commodity_Code] SMALLINT NOT NULL,
    [Accumed_Kgs] REAL NOT NULL  -- in 32/34 clients,
    [Accumed_Cost] REAL NOT NULL  -- in 32/34 clients,
    [Accumed_CustFeed_charge] REAL NOT NULL  -- in 32/34 clients,
    [Date_last_updated] DATETIME NOT NULL  -- in 32/34 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 32/34 clients
    ,CONSTRAINT [PK_Beast_Accumed_Feed_by_commodity] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_Breeding] (
    [Beast_ID] INT NOT NULL,
    [Birth_Date] DATETIME NULL,
    [Birth_Wght] REAL NULL,
    [Sire] SMALLINT NULL,
    [Dam] SMALLINT NULL,
    [Genetics] SMALLINT NULL,
    [Notes] NTEXT NULL
    ,CONSTRAINT [PK_Beast_Breeding] PRIMARY KEY ([Beast_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_Cull_Reasons] (
    [Cull_Reason_ID] SMALLINT NOT NULL,
    [Cull_Reason] VARCHAR(15) NULL,
    [PayRate_per_Kg] REAL NULL,
    [Induction_cull] BIT NULL,
    [Later_cull] BIT NULL
    ,CONSTRAINT [PK_Beast_Cull_Reasons] PRIMARY KEY ([Cull_Reason_ID])
);

-- Table found in 22 client(s): Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_days_in_pen_for_period] (
    [Pen] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [BeastID] INT NOT NULL,
    [Days_in_pen_for_period] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Beast_days_in_pen_for_period] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_Ohead_Appl_History] (
    [Ohead_Appl_Month_End_Date] DATETIME NULL,
    [Location_code] SMALLINT NULL  -- in 2/34 clients,
    [Ohead_$/Hd/Day] MONEY NULL,
    [Ohead_Gross_Value] MONEY NULL,
    [Ohead_Head] INT NULL,
    [Ohead_$/Hd/Day_Pen1] MONEY NULL,
    [Ohead_Gross_Value_Pen1] MONEY NULL,
    [Ohead_Head_Pen1] INT NULL,
    [Ohead_$/Hd/Day_Pen2] MONEY NULL,
    [Ohead_Gross_Value_Pen2] MONEY NULL,
    [Ohead_Head_Pen2] INT NULL,
    [Ohead_$/Hd/Day_Pen3] MONEY NULL,
    [Ohead_Gross_Value_Pen3] MONEY NULL,
    [Ohead_Head_Pen3] INT NULL,
    [Ohead_$/Hd/Day_Pen4] MONEY NULL,
    [Ohead_Gross_Value_Pen4] MONEY NULL,
    [Ohead_Head_Pen4] INT NULL,
    [Ohead_$/Hd/Day_Pen5] MONEY NULL,
    [Ohead_Gross_Value_Pen5] MONEY NULL,
    [Ohead_Head_Pen5] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Ohead_$/Hd/Day_Oth] MONEY NULL,
    [Ohead_Gross_Value_Oth] MONEY NULL,
    [Ohead_Head_Oth] INT NULL
    ,CONSTRAINT [PK_Beast_Ohead_Appl_History] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Beast_Sale_Types_RV] (
    [Sale_Type_ID] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Sale_Type] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20)
    ,CONSTRAINT [PK_Beast_Sale_Types_RV] PRIMARY KEY ([Sale_Type_ID])
);

-- Table found in 32 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Archive_Filter] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BeastID_Archive_Filter] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_BU_Filter] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BeastID_BU_Filter] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Feed_Keys] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BeastID_Feed_Keys] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Filter] (
    [BeastID] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BeastID_Filter] PRIMARY KEY ([ID])
);

-- Table found in 19 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Reid River Export, Semini, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [BeastID_Filter_BatchUpdate] (
    [BeastID] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_KeyFile] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_KeyFile] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2DE] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2DE] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser3] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser4] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser5] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser5] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): 2DE
CREATE TABLE [BeastID_Keyfile_2deuser6] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_2deuser6] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_accounts] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_accounts] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_ACCOUNTS_LAPTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_ACCOUNTS_LAPTOP] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_ACCOUNTS_PC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_ACCOUNTS_PC] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_Admin] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_admin1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_admin1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_admin2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_admin2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_admin3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_admin3] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_ADMIN_LAPTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_ADMIN_LAPTOP] PRIMARY KEY ([BeastID])
);

-- Table found in 9 client(s): 2DE, Barmount, Bos Grazing, Conargo Feedlot, Demonstration Database, Hutchinson Grazing, Lowlands Pastoral Co, Thomas Foods, Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_Administrator] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Administrator] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_adminlocal] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_adminlocal] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_AdminOffice] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_AFSQL] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AFSQL] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_ameliabarry] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_amy] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_amy] PRIMARY KEY ([BeastID])
);

-- Table found in 3 client(s): Moruya Feedlot, Reid River Export, Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_AndrewConaghan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AndrewConaghan] PRIMARY KEY ([BeastID])
);

-- Table found in 6 client(s): AAMIG, Conargo Feedlot, KO Beef, Lowlands Pastoral Co, Moruya Feedlot, Reid River Export
CREATE TABLE [BeastID_Keyfile_ANDREWS_DESKTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 3 client(s): Coggan Agriculture, Conargo Feedlot, Penna & Sons
CREATE TABLE [BeastID_Keyfile_ANDREWS_LAPTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_ANDREWS_LAPTOP] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_AnnabelTudor] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AnnabelTudor] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_arose] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_arose] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_ASSTOFFICE] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_AULOWDSK00207] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_AUWMBDSK00325] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_AUWMBDSK00381] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_AVONDALE_CRUSH] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AVONDALE_CRUSH] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_AVONDALE_CRUSH2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AVONDALE_CRUSH2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_AVONDALE_CRUSH3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_AVONDALE_CRUSH3] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_BARSVR01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_BARSVR01] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_biancathorn] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_BOSGRAZING] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_BOSGRAZING] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser3] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser4] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser5] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser5] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser6] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser6] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Bos Grazing
CREATE TABLE [BeastID_Keyfile_bosgrazinguser7] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bosgrazinguser7] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_bottomhospital] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bottomhospital] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_BSlaterA] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_BSlaterA] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_BSNTRADING] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_BSNTRADING] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_bsntradinguser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bsntradinguser1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_bsntradinguser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bsntradinguser2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_bsntradinguser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bsntradinguser3] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_bsntradinguser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bsntradinguser4] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): BSN Trading
CREATE TABLE [BeastID_Keyfile_bsntradinguser5] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_bsntradinguser5] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_CadelgaServer] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_CadelgaServer] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_cattle] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_cattle] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_CattleRamp] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_CattleRamp] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_CF_RDS01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_CF_TS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): CH2 Pastoral
CREATE TABLE [BeastID_Keyfile_CH2PASTORAL] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_CLAY] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_CLAY_PC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_COATES_PC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_COATESFUJIADMIN] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Coggan Agriculture
CREATE TABLE [BeastID_Keyfile_COGG_PC_0001] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_COGG_PC_0001] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_conaghana] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_conaghana] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_DESKTOP1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_DESKTOP2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Moruya Feedlot
CREATE TABLE [BeastID_Keyfile_DESKTOP_145PN42] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_DESKTOP_384TGM2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_DESKTOP_7AN36N4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): CH2 Pastoral
CREATE TABLE [BeastID_Keyfile_DESKTOP_AV5U0RU] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Mirambee Livestock
CREATE TABLE [BeastID_Keyfile_DESKTOP_AVGECIM] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BeastID_Keyfile_DESKTOP_CRP5RVV] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_DESKTOP_D70ASNM] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_DESKTOP_FDKFPCS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_DESKTOP_GEJSVEN] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_DESKTOP_PQ94RN3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_diana] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_diana] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_DIGISTAR] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_egreed] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_egreed] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Willow Bend Feedlot
CREATE TABLE [BeastID_Keyfile_ERIC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_Feed] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Feed] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BeastID_Keyfile_FEED_LOT] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_Feeding] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Feeding] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Llanarth Pastoral Co, Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_Feedlot] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Feedlot] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_FEEDLOT1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_Feedlot2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Feedlot2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_FeedShed] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_FeedShed] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_FMS_SVR] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_FMS_SVR] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_fryerm] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_fryerm] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BeastID_Keyfile_GAIL_LAPTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_hannah] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hannah] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_HO-LVSTK-BEEF] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_HO-LVSTK-BEEF] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_HO_LVSTK_BEEF] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_HO_LVSTK_BEEF] PRIMARY KEY ([BeastID])
);

-- Table found in 3 client(s): Cadelga Cattle Co, Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_Hospital] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Hospital] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_hospital2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hospital2] PRIMARY KEY ([BeastID])
);

-- Table found in 6 client(s): Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Myrtlevale Partnership, Semini, Tonkin Farming
CREATE TABLE [BeastID_Keyfile_HPDESKTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BeastID_Keyfile_HUTCHINSON] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_HUTCHINSON] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BeastID_Keyfile_hutchinsonuser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hutchinsonuser1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BeastID_Keyfile_hutchinsonuser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hutchinsonuser2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BeastID_Keyfile_hutchinsonuser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hutchinsonuser3] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Hutchinson Grazing
CREATE TABLE [BeastID_Keyfile_hutchinsonuser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_hutchinsonuser4] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_induction] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_jackbrumley] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_James] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_Jason] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Jason] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_Jedd] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Jedd] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_JENNY] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_Josh] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Josh] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Myrtlevale Partnership
CREATE TABLE [BeastID_Keyfile_JULIEREID_PC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_KathreneAsturias] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_KathreneAsturias] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS02] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS03] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS04] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS05] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS06] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS07] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KO_WS6538] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_KOBEEF] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser5] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser6] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser7] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_kobeefuser8] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_laceyeccles] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Moruya Feedlot
CREATE TABLE [BeastID_Keyfile_LAPTOP_2JJ7S2SO] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Glen Avon
CREATE TABLE [BeastID_Keyfile_LAPTOP_6DJ6VE8K] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_LAPTOP_MACSF6QC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_Livestock] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Livestock] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_LLANARTH] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_llanarthuser1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_llanarthuser2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_llanarthuser3] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_llanarthuser4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Llanarth Pastoral Co
CREATE TABLE [BeastID_Keyfile_llanarthuser5] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_lmcculloch] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_lmcculloch] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_loader] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_loader] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BeastID_Keyfile_louisemartelloni] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_LyniseConaghan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_LyniseConaghan] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_marney] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_marney] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_marybethjarloyan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_matthewwooster] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_Maureen] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Maureen] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_mbinch] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_mbinch] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_Melissa] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Melissa] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_MelissaKenny] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_MelissaKenny] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Mirambee Livestock
CREATE TABLE [BeastID_Keyfile_MFL_WKS01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_MichaelSwain] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_Mill] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Mill] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_MKruschel] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_MKruschel] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_MKruschelA] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_MKruschelA] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Barmount, KO Beef
CREATE TABLE [BeastID_Keyfile_Office] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Office] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_OFFICE4] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_pburns] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_pburns] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_pburnsa] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_pburnsa] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_Penrider] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Penrider] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_penriders] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_PhilConaghan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_PhilConaghan] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): KO Beef
CREATE TABLE [BeastID_Keyfile_PossumGully] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): P&C and D&G Tuohey
CREATE TABLE [BeastID_Keyfile_PROBOOK_470G1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_Process] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Process] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_RammieYlagan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RammieYlagan] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_Ramp] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Ramp] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Barmount
CREATE TABLE [BeastID_Keyfile_ReganConaghan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_ReganConaghan] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BeastID_Keyfile_Remote] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Remote] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_REPORTS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_REPORTS] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_RichardC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RichardC] PRIMARY KEY ([BeastID])
);

-- Table found in 3 client(s): Conargo Feedlot, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_RichardConibear] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RichardConibear] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_RRD_HPPD_01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_RRED_W01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_RRED_W02] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_RRED_W03] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_RRSERVER] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP41] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP41] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP45] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP45] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP46] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP46] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP47] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP47] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP50] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP50] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP51] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP51] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP53] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP53] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP55] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP55] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP56] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP56] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP57] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP57] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP65] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP65] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP66] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP66] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVDESKTOP67] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVDESKTOP67] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP40] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP40] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP64] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP64] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP66] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP66] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP68] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP68] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP70] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP70] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVLAPTOP74] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVLAPTOP74] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_RVSVR05] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_RVSVR05] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_sbsloader] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_sbsloader] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BeastID_Keyfile_SCF_COW_NB03] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Semini
CREATE TABLE [BeastID_Keyfile_SCF_COW_WS02] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_schmidtw] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_schmidtw] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_seanfarrell] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_SERVER] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_SERVER] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BeastID_Keyfile_shannonokeeffe] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_shaunbeard] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_shed] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_shed] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_slacka] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_slacka] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_slackm] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_slackm] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_SmithA] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_SmithA] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_SmithR] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_SmithR] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_Stephen] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Stephen] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_strkj] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_strkj] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Avondale Feedlot
CREATE TABLE [BeastID_Keyfile_SUPERVISORPC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_SUPERVISORPC] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Lowlands Pastoral Co, Midfield Group
CREATE TABLE [BeastID_Keyfile_tamarawaterman] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_TArmfield] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TArmfield] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Demonstration Database
CREATE TABLE [BeastID_Keyfile_TESSA_LAPTOP] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TESSA_LAPTOP] PRIMARY KEY ([BeastID])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [BeastID_Keyfile_TessaConaghan] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TessaConaghan] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BeastID_Keyfile_TF01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_TFI_ADL_D06] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TFI_ADL_D06] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_TFI_ADL_D08] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TFI_ADL_D08] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Thomas Foods
CREATE TABLE [BeastID_Keyfile_TFI_ADL_D16] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TFI_ADL_D16] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [BeastID_Keyfile_theresacraig] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_THINK1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BeastID_Keyfile_TNE_W01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TNE_W01] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Anna Plains Feedlot
CREATE TABLE [BeastID_Keyfile_TNEPastorial] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TNEPastorial] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BeastID_Keyfile_TONKINREPORTS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Tonkin Farming
CREATE TABLE [BeastID_Keyfile_TONKINTB01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_TopHospital] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_TopHospital] PRIMARY KEY ([BeastID])
);

-- Table found in 20 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [BeastID_KeyFile_TR] (
    [BeastID] INT NOT NULL,
    [UserNumber] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_BeastID_KeyFile_TR] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Reid River Export
CREATE TABLE [BeastID_Keyfile_TRENT] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Kerrigan Valley Feedlot
CREATE TABLE [BeastID_Keyfile_TREVOR_LT] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Kerrigan Valley Feedlot
CREATE TABLE [BeastID_Keyfile_TREVOR_NB] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Freestone Feedlot
CREATE TABLE [BeastID_Keyfile_USER_PC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_VHLFeed] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_VHLFeed] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_VHLTS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_VHLTS] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Victoria Hill Lamb
CREATE TABLE [BeastID_Keyfile_vhlyards] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_vhlyards] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Cadelga Cattle Co
CREATE TABLE [BeastID_Keyfile_Weighbridge] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Weighbridge] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_WF_RDS] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_WF_RDS] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [BeastID_Keyfile_WilliamsonC] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_WilliamsonC] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Willow Bend Feedlot
CREATE TABLE [BeastID_Keyfile_WILLOWBEND] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 6 client(s): Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, KO Beef, Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_Yards] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_Yards] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [BeastID_Keyfile_YL_RDS01] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_YL_RDS01] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zav1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zbj1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zbj1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zbm2] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zbm2] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zcl1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zcl1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zdm1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zdm1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zes1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zfs1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zjg1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zjs1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 2 client(s): Conargo Feedlot, Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zkh1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zkh1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zmd1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zmr1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zpm1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zpm1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zrc1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_Zre1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [BeastID_Keyfile_zrn1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
    ,CONSTRAINT [PK_BeastID_Keyfile_zrn1] PRIMARY KEY ([BeastID])
);

-- Table found in 1 client(s): Conargo Feedlot
CREATE TABLE [BeastID_Keyfile_zsb1] (
    [BeastID] INT NOT NULL,
    [Beast_Cost] REAL NULL,
    [Beast_Expenses] REAL NULL,
    [Beast_Income] REAL NULL,
    [Calcd_DOF] SMALLINT NULL,
    [Calcd_DIP] SMALLINT NULL,
    [UserNumber] SMALLINT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BeastID_Proj_KeyFile] (
    [BeastID] INT NOT NULL,
    [Proj_Weight_date] DATETIME NULL,
    [Proj_weight] INT NULL,
    [Proj_Live_Wght_for CarcWght] INT NULL,
    [Beast_Proj_Feed_Costs] REAL NULL
    ,CONSTRAINT [PK_BeastID_Proj_KeyFile] PRIMARY KEY ([BeastID])
);

-- Table found in 15 client(s): BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Freestone Feedlot, KO Beef, Llanarth Pastoral Co, Rangers Valley, Reid River Export, Semini, Victoria Hill Lamb, Wanderribby Feedlot
CREATE TABLE [BeastMovement] (
    [BeastID] INT NOT NULL,
    [MoveDate] DATETIME NULL
    ,CONSTRAINT [PK_BeastMovement] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [BodySystems] (
    [BS_ID] SMALLINT NOT NULL,
    [BodySystem] VARCHAR(20) NOT NULL
    ,CONSTRAINT [PK_BodySystems] PRIMARY KEY ([BS_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Breeding_Categories] (
    [Breed_Category_ID] SMALLINT NOT NULL,
    [Breed_Category] NVARCHAR(25) NOT NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Breed_Category_Desc] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50)
    ,CONSTRAINT [PK_Breeding_Categories] PRIMARY KEY ([Breed_Category_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Breeding_Dams] (
    [Dam_ID] SMALLINT NOT NULL,
    [Dam_Name] VARCHAR(50) NOT NULL,
    [Dam_Supplier] VARCHAR(50) NULL
    ,CONSTRAINT [PK_Breeding_Dams] PRIMARY KEY ([Dam_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Breeding_Sires] (
    [Sire_ID] SMALLINT NOT NULL,
    [Sire_Name] NVARCHAR(50) NOT NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Sire_Supplier] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Sire_Line_ID] SMALLINT NULL,
    [AWA_Sire_ID] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [AWA Sire ID] VARCHAR(50) NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Breeding_Sires] PRIMARY KEY ([Sire_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Breeds] (
    [Breed_Code] SMALLINT NOT NULL,
    [Breed_Name] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15)
    ,CONSTRAINT [PK_Breeds] PRIMARY KEY ([Breed_Code])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Bunk_Code_Desc] (
    [Ration_Type] SMALLINT NULL,
    [Bunk_Code] SMALLINT NULL,
    [Kgs_Head_Adj] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Bunk_Code_Desc] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Bunk_Readings] (
    [Pen_Number_ID] SMALLINT NULL,
    [Date_Checked] DATETIME NULL,
    [Bunk_Reading] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Feed_Alloc] REAL NULL,
    [No_Head] SMALLINT NULL,
    [PF_Kgs/Head_Change?] BIT NOT NULL  -- in 25/28 clients,
    [BK_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 25/28 clients,
    [Ration_Code] SMALLINT NULL  -- in 25/28 clients,
    [Early_Bunk_Reading] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2)  -- in 25/28 clients,
    [MMEC_Kgs_Head] REAL NULL  -- in 25/28 clients,
    [MMEC_MaxFeed] REAL NULL  -- in 25/28 clients,
    [MMEC_Incr_If_Slick] REAL NULL  -- in 25/28 clients,
    [MMEC_Ration] REAL NULL  -- in 25/28 clients,
    [Mob_name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8)  -- in 25/28 clients,
    [Early_bunk_reading2] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2)  -- in 25/28 clients,
    [Kgs_feed_remaining] SMALLINT NULL  -- in 25/28 clients,
    [Avg_Kgs_Fed_Today] REAL NULL  -- in 24/28 clients,
    [Shovel_bunk] BIT NULL  -- in 24/28 clients,
    [Notes] NVARCHAR(250) NULL  -- types seen: NVARCHAR(250), NVARCHAR(50), VARCHAR(250)  -- in 24/28 clients
    ,CONSTRAINT [PK_Bunk_Readings] PRIMARY KEY ([BK_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Bunk_Sheet_Report] (
    [Pen_Name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Mob_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Line_Desc] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Day7_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day6_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day5_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day4_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day3_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day2_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Day1_Figure] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [DOF] INT NULL,
    [Head] INT NULL,
    [Avg_Start_Wght] INT NULL,
    [Fourteen_Day_Avg] REAL NULL,
    [Seven_Day_Avg] REAL NULL,
    [Avg_Current_Wght] REAL NULL  -- in 21/28 clients,
    [DOF_text] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8)  -- in 19/28 clients
    ,CONSTRAINT [PK_Bunk_Sheet_Report] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [Bunks1203-IDS] (
    [Bk_ID] INT NOT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carc_Feedback_Compliance] (
    [SupplierID] SMALLINT NOT NULL,
    [SupplierName] VARCHAR(50) NULL,
    [Detail_Lot_No] VARCHAR(7) NULL,
    [Hist_Lot_No] VARCHAR(7) NULL,
    [Pref_Intake_Fat] VARCHAR(15) NULL,
    [Intake_Fat_Group] REAL NULL  -- in 32/34 clients,
    [Intake_Fat_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_Intake_Wght] VARCHAR(20) NULL  -- in 32/34 clients,
    [Intake_Wght_Group] REAL NULL  -- in 32/34 clients,
    [Intake_Wght_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_Intake_Teeth] VARCHAR(20) NULL  -- in 32/34 clients,
    [Intake_Teeth_Group] REAL NULL  -- in 32/34 clients,
    [Intake_Teeth_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_SaleWght] VARCHAR(20) NULL  -- in 32/34 clients,
    [SaleWght_Group] REAL NULL  -- in 32/34 clients,
    [SaleWght_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_WGD] VARCHAR(20) NULL  -- in 32/34 clients,
    [WGD_Group] REAL NULL  -- in 32/34 clients,
    [WGD_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_Dress_Pcnt] VARCHAR(20) NULL  -- in 32/34 clients,
    [Dress_Pcnt_Group] REAL NULL  -- in 32/34 clients,
    [Dress_Pcnt_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_Mrb] VARCHAR(20) NULL  -- in 32/34 clients,
    [Mrb_Group] REAL NULL  -- in 32/34 clients,
    [Mrb_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_CarcP8] VARCHAR(20) NULL  -- in 32/34 clients,
    [CarcP8_Group] REAL NULL  -- in 32/34 clients,
    [CarcP8_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_EMA] VARCHAR(20) NULL  -- in 32/34 clients,
    [EMA_Group] REAL NULL  -- in 32/34 clients,
    [EMA_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_FatCol] VARCHAR(20) NULL  -- in 32/34 clients,
    [FatCol_Group] REAL NULL  -- in 32/34 clients,
    [FatCol_Hist] REAL NULL  -- in 32/34 clients,
    [Pref_MeatCol] VARCHAR(20) NULL  -- in 32/34 clients,
    [MeatCol_Group] REAL NULL  -- in 32/34 clients,
    [MeatCol_Hist] REAL NULL  -- in 32/34 clients
    ,CONSTRAINT [PK_Carc_Feedback_Compliance] PRIMARY KEY ([SupplierID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carc_Feedback_Mth_Avgs] (
    [YrMnth] NVARCHAR(4) NOT NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [Sale_Wght] REAL NULL,
    [DOF] REAL NULL,
    [WG_Day] REAL NULL,
    [Carc_Wght] REAL NULL,
    [Dress_Pcnt] REAL NULL  -- in 32/34 clients,
    [Carc_Teeth] REAL NULL  -- in 32/34 clients,
    [P8_fat] REAL NULL  -- in 32/34 clients,
    [Eye_Mscle_Area] REAL NULL  -- in 32/34 clients,
    [Marbling] REAL NULL  -- in 32/34 clients,
    [Fat_Colour] REAL NULL  -- in 32/34 clients,
    [Meat_Text] REAL NULL  -- in 32/34 clients,
    [Marbling2] REAL NULL  -- in 1/34 clients,
    [MSA_Index] REAL NULL  -- in 1/34 clients,
    [RibFatCold] SMALLINT NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Carc_Feedback_Mth_Avgs] PRIMARY KEY ([YrMnth])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carc_Feedback_Report_data] (
    [RecordType] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Beast_ID] INT NULL,
    [SupplierID] SMALLINT NULL,
    [Ear_Tag_No] VARCHAR(7) NULL  -- types seen: VARCHAR(7), VARCHAR(8),
    [YrMnth] VARCHAR(4) NULL,
    [PurchDate] DATETIME NULL,
    [PurchWght] REAL NULL,
    [VendorTag] VARCHAR(10) NULL,
    [FL_Ent_Date] DATETIME NULL,
    [FL_Ent_Wght] REAL NULL,
    [Sale_Date] DATETIME NULL,
    [Sale_Wght] REAL NULL,
    [WG_Day] REAL NULL,
    [DOF] REAL NULL,
    [Carc_Wght] REAL NULL,
    [Dress_Pcnt] REAL NULL  -- in 31/34 clients,
    [Carc_Teeth] REAL NULL  -- in 31/34 clients,
    [P8_fat] REAL NULL  -- in 31/34 clients,
    [Eye_Mscle_Area] SMALLINT NULL  -- in 31/34 clients,
    [Marbling] REAL NULL  -- in 31/34 clients,
    [Fat_Colour] REAL NULL  -- in 31/34 clients,
    [Meat_Colour] REAL NULL  -- in 31/34 clients,
    [Meat_Text] REAL NULL  -- in 31/34 clients,
    [Died] BIT NOT NULL  -- in 31/34 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 31/34 clients,
    [Sickness_costs] REAL NULL  -- in 29/34 clients,
    [Marbling2] REAL NULL  -- in 1/34 clients,
    [MSA_Index] REAL NULL  -- in 1/34 clients,
    [RibFatCold] SMALLINT NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Carc_Feedback_Report_data] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carcase_data] (
    [Beast_ID] INT NOT NULL,
    [Ear_Tag_No] VARCHAR(8) NOT NULL,
    [EID] VARCHAR(16) NULL,
    [Sold_To] VARCHAR(20) NULL,
    [Abattoir] VARCHAR(20) NULL,
    [Body_Number] VARCHAR(6) NULL,
    [Kill_Date] DATETIME NULL,
    [Carc_Wght_left] REAL NULL,
    [Carc_Wght_right] REAL NULL  -- in 33/34 clients,
    [Dress_Pcnt] REAL NULL  -- in 33/34 clients,
    [Teeth] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 33/34 clients,
    [Grade] VARCHAR(5) NULL  -- in 33/34 clients,
    [Price_$/Kg_Left] REAL NULL  -- in 33/34 clients,
    [Price_$/Kg_Right] REAL NULL  -- in 33/34 clients,
    [P8_fat] REAL NULL  -- in 33/34 clients,
    [Rib_fat] REAL NULL  -- in 33/34 clients,
    [Mscle_Score] VARCHAR(2) NULL  -- in 33/34 clients,
    [Eye_Mscle_Area] REAL NULL  -- in 33/34 clients,
    [PH_level] REAL NULL  -- in 33/34 clients,
    [Marbling] REAL NULL  -- in 33/34 clients,
    [Fat_Colour] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 33/34 clients,
    [Mscle_Colour] VARCHAR(2) NULL  -- in 33/34 clients,
    [Meat_Texture] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 33/34 clients,
    [Meat_Yield] REAL NULL  -- in 33/34 clients,
    [Contract_No] VARCHAR(6) NULL  -- types seen: VARCHAR(10), VARCHAR(6)  -- in 33/34 clients,
    [Bruising_L] VARCHAR(2) NULL  -- in 33/34 clients,
    [Bruising_R] VARCHAR(2) NULL  -- in 33/34 clients,
    [$/Kg_Deduction] REAL NULL  -- in 33/34 clients,
    [Dockage_Reason] VARCHAR(10) NULL  -- in 33/34 clients,
    [Live_Weight_Shrink_Pcnt] REAL NULL  -- in 33/34 clients,
    [Marbling_Category] VARCHAR(2) NULL  -- in 33/34 clients,
    [Marbling2] REAL NULL  -- in 33/34 clients,
    [Ossification] SMALLINT NULL  -- in 33/34 clients,
    [Firmness] SMALLINT NULL  -- in 33/34 clients,
    [Pricing_Method] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 33/34 clients,
    [ChillerNumber] VARCHAR(6) NULL  -- in 33/34 clients,
    [Beast_Sale_Type] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 33/34 clients,
    [Sold_To_Contact_ID] SMALLINT NULL  -- in 33/34 clients,
    [Abattoir_ID] SMALLINT NULL  -- in 33/34 clients,
    [Boning_Group] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2)  -- in 33/34 clients,
    [Hump_cold] SMALLINT NULL  -- in 33/34 clients,
    [Loin_temp] REAL NULL  -- in 33/34 clients,
    [Carc_damage_L] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2)  -- in 33/34 clients,
    [Carc_damage_R] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2)  -- in 33/34 clients,
    [MSA_Index] REAL NULL  -- in 33/34 clients,
    [Marbling_bonus_rate] REAL NULL  -- in 33/34 clients,
    [RCInvoice_Date] DATETIME NULL  -- in 32/34 clients,
    [Marbling_bonus_value] REAL NULL  -- in 32/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 32/34 clients,
    [Hump_Height] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 31/34 clients,
    [MEQMSA] SMALLINT NULL  -- in 31/34 clients,
    [MEQAUSMRB] SMALLINT NULL  -- in 31/34 clients,
    [Boning_date] DATETIME NULL  -- in 31/34 clients,
    [Abattoir_Establishment_Number] INT NULL  -- in 30/34 clients,
    [Abattoir_Proc_Number] INT NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Carcase_data] PRIMARY KEY ([Beast_ID])
);

-- Table found in 2 client(s): Barmount, Rangers Valley
CREATE TABLE [Carcase_DataType2] (
    [keyPlantChainKillBody] NVARCHAR(20) NULL,
    [species] NVARCHAR(10) NULL,
    [eqsRef] NVARCHAR(5) NULL,
    [plant] NVARCHAR(10) NULL,
    [killDate] DATETIME NULL,
    [bodyNo] SMALLINT NULL,
    [vendorProducer] NVARCHAR(10) NULL,
    [ownerProducer] NVARCHAR(10) NULL,
    [plantBoningRun] NVARCHAR(5) NULL,
    [coldGrader] NVARCHAR(10) NULL,
    [hotGrader] NVARCHAR(10) NULL,
    [gradeDate] DATETIME NULL,
    [leftSideScanTime] NVARCHAR(10) NULL,
    [rightSideScanTime] NVARCHAR(10) NULL,
    [hangMethod] NVARCHAR(10) NULL,
    [hgp] NVARCHAR(2) NULL,
    [sex] NVARCHAR(2) NULL,
    [dentition] NVARCHAR(2) NULL,
    [leftHscw] REAL NULL,
    [rightHscw] REAL NULL,
    [totalHscw] REAL NULL,
    [operator] NVARCHAR(10) NULL,
    [dest] NVARCHAR(10) NULL,
    [p8Fat] SMALLINT NULL,
    [lot] NVARCHAR(10) NULL,
    [epbi] NVARCHAR(10) NULL,
    [humpCold] SMALLINT NULL,
    [ema] SMALLINT NULL,
    [ossificationCold] SMALLINT NULL,
    [ausMarbling] SMALLINT NULL,
    [msaMarbling] SMALLINT NULL,
    [meatColour] NVARCHAR(2) NULL,
    [fatColour] NVARCHAR(2) NULL,
    [ribfatCold] SMALLINT NULL,
    [ph] REAL NULL,
    [loinTemp] REAL NULL,
    [mfv] NVARCHAR(1) NULL,
    [rinse] NVARCHAR(1) NULL,
    [saleyard] NVARCHAR(10) NULL,
    [rib] SMALLINT NULL,
    [gradeCode] SMALLINT NULL,
    [nlis] NVARCHAR(16) NULL,
    [rfid] NVARCHAR(16) NULL,
    [gradeMethod] SMALLINT NULL,
    [humpHot] SMALLINT NULL,
    [feedType] NVARCHAR(10) NULL,
    [ossificationHot] SMALLINT NULL,
    [noDaysOnFeed] SMALLINT NULL,
    [plantBoneRunTemplate] NVARCHAR(50) NULL,
    [msaVendorDecSerial] NVARCHAR(10) NULL,
    [msaVendorDecCount] SMALLINT NULL,
    [nvdSerial] NVARCHAR(10) NULL,
    [nvdSerialPrefix] NVARCHAR(10) NULL,
    [saleyardNo] NVARCHAR(10) NULL,
    [fatDistribution] NVARCHAR(5) NULL,
    [chainNo] NVARCHAR(5) NULL,
    [hidePullerDamage] NVARCHAR(5) NULL,
    [failMisc] NVARCHAR(5) NULL,
    [cutCookAlgorithmVersionNumber] NVARCHAR(5) NULL,
    [msaIndex] REAL NULL,
    [opportunityIndex] REAL NULL,
    [processorIndex] REAL NULL,
    [Boning_Date] DATETIME NULL,
    [ID] BIGINT NOT NULL,
    [Date_record_added] DATETIME NULL  -- in 1/2 clients
    ,CONSTRAINT [PK_Carcase_DataType2] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carcase_Grades] (
    [Grade_Code] VARCHAR(5) NOT NULL,
    [Description] VARCHAR(30) NULL,
    [Price_doll_per_Kg] REAL NULL,
    [Effective_from_date] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Carcase_Grades] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carcase_Grades_US] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Qual_Grade] VARCHAR(5) NOT NULL,
    [YG1_price] REAL NULL,
    [YG2_price] REAL NULL,
    [YG3_price] REAL NULL,
    [YG4_price] REAL NULL,
    [YG5_price] REAL NULL,
    [From_Date] DATETIME NOT NULL
    ,CONSTRAINT [PK_Carcase_Grades_US] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carcase_import_Data] (
    [Col1] VARCHAR(15) NULL,
    [Col2] VARCHAR(15) NULL,
    [Col3] VARCHAR(15) NULL,
    [Col4] VARCHAR(15) NULL,
    [Col5] VARCHAR(15) NULL,
    [Col6] VARCHAR(15) NULL,
    [Col7] VARCHAR(15) NULL,
    [Col8] VARCHAR(15) NULL,
    [Col9] VARCHAR(15) NULL,
    [Col10] VARCHAR(15) NULL,
    [Col11] VARCHAR(15) NULL,
    [Col12] VARCHAR(15) NULL,
    [Col13] VARCHAR(15) NULL,
    [Col14] VARCHAR(15) NULL,
    [Col15] VARCHAR(15) NULL,
    [Col16] VARCHAR(15) NULL,
    [Col17] VARCHAR(15) NULL,
    [Col18] VARCHAR(15) NULL,
    [Col19] VARCHAR(15) NULL,
    [Col20] VARCHAR(15) NULL,
    [Col21] VARCHAR(15) NULL,
    [Col22] VARCHAR(15) NULL,
    [Col23] VARCHAR(15) NULL,
    [Col24] VARCHAR(15) NULL,
    [Col25] VARCHAR(15) NULL,
    [Warning] VARCHAR(100) NULL,
    [Error] VARCHAR(100) NULL,
    [Import_Date] DATETIME NULL,
    [Session_ID] INT NULL  -- in 33/34 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 33/34 clients
    ,CONSTRAINT [PK_Carcase_import_Data] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Carcase_Prices] (
    [Sold_To_ID] SMALLINT NOT NULL,
    [Kill_Date_From] DATETIME NOT NULL,
    [Kill_Date_To] DATETIME NOT NULL,
    [Marbling_From] REAL NOT NULL,
    [Marbling_To] REAL NOT NULL,
    [Meat_Colour_From] VARCHAR(2) NOT NULL,
    [Meat_Colour_To] VARCHAR(2) NOT NULL,
    [Price_per_Kg] REAL NOT NULL,
    [Live_or_carc_Wght] VARCHAR(1) NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Carcase_Prices] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle] (
    [BeastID] INT NOT NULL,
    [Ear_Tag] VARCHAR(8) NOT NULL,
    [EID] VARCHAR(16) NULL,
    [Tail_Tag] NVARCHAR(10) NULL  -- types seen: CHAR(10), NVARCHAR(10), VARCHAR(10),
    [Vendor_Ear_Tag] VARCHAR(9) NULL  -- types seen: VARCHAR(6), VARCHAR(9),
    [Group_Name] NVARCHAR(15) NULL  -- types seen: CHAR(15), NVARCHAR(15),
    [Sub_Group] NVARCHAR(15) NULL  -- types seen: CHAR(15), NVARCHAR(15),
    [Breed] SMALLINT NULL,
    [Sex] VARCHAR(1) NULL,
    [HGP] BIT NOT NULL,
    [Background_Doll_per_Kg] REAL NULL  -- in 32/34 clients,
    [Start_Date] DATETIME NULL  -- in 32/34 clients,
    [Start_Weight] REAL NULL  -- in 32/34 clients,
    [Sale_Date] DATETIME NULL  -- in 32/34 clients,
    [Sale_Weight] REAL NULL  -- in 32/34 clients,
    [Weight_Gain] REAL NULL  -- in 32/34 clients,
    [WG_per_Day] REAL NULL  -- in 32/34 clients,
    [Profit_Loss] REAL NULL  -- in 32/34 clients,
    [Carcase_Weight] REAL NULL  -- in 32/34 clients,
    [BG_Fee] REAL NULL  -- in 32/34 clients,
    [Teeth] VARCHAR(1) NULL  -- in 32/34 clients,
    [WHold_Until] DATETIME NULL  -- in 32/34 clients,
    [Died] BIT NOT NULL  -- in 32/34 clients,
    [Date_died] VARCHAR(10) NULL  -- in 32/34 clients,
    [Notes] NTEXT NULL  -- in 32/34 clients,
    [Sire_Tag] VARCHAR(10) NULL  -- in 32/34 clients,
    [Dam_Tag] VARCHAR(10) NULL  -- in 32/34 clients,
    [Paddock_WG] REAL NULL  -- in 32/34 clients,
    [Feedlot_WG] REAL NULL  -- in 32/34 clients,
    [DOB] DATETIME NULL  -- in 32/34 clients,
    [Last_Ohead_Update_date] DATETIME NULL  -- in 32/34 clients,
    [EU_Dec_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(10), VARCHAR(15)  -- in 32/34 clients,
    [Feedlot_Entry_Date] DATETIME NULL  -- in 32/34 clients,
    [Feedlot_Entry_Wght] REAL NULL  -- in 32/34 clients,
    [Pen_Number] VARCHAR(10) NULL  -- in 32/34 clients,
    [Off_Feed] BIT NOT NULL  -- in 32/34 clients,
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12)  -- in 32/34 clients,
    [In_Hospital] BIT NOT NULL  -- in 32/34 clients,
    [Buller] BIT NOT NULL  -- in 32/34 clients,
    [Non_Performer] BIT NOT NULL  -- in 32/34 clients,
    [Frame_Size] VARCHAR(5) NULL  -- in 32/34 clients,
    [Custom_Feeder] BIT NOT NULL  -- in 32/34 clients,
    [Date_Moved_Pen] DATETIME NULL  -- in 32/34 clients,
    [DOF_in_prev_FL] SMALLINT NULL  -- in 32/34 clients,
    [Market_Category] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [In_Feedlot] VARCHAR(1) NOT NULL  -- in 32/34 clients,
    [Agist_Charged_Up_To_Date] DATETIME NULL  -- in 32/34 clients,
    [Cull_Reason] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [Agist_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12), VARCHAR(7)  -- in 32/34 clients,
    [Current_LocType_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [Old_RFID] VARCHAR(16) NULL  -- in 32/34 clients,
    [Date_RFID_Changed] DATETIME NULL  -- in 32/34 clients,
    [Trial_No_ID] SMALLINT NULL  -- in 32/34 clients,
    [NFAS_Decl_Numb] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(10), VARCHAR(15)  -- in 32/34 clients,
    [GrowerGroupCode] SMALLINT NULL  -- in 32/34 clients,
    [Date_culled] DATETIME NULL  -- in 32/34 clients,
    [Date_Archived] DATETIME NULL  -- in 32/34 clients,
    [Agistment_PIC] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8)  -- in 32/34 clients,
    [Blood_vial_number] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 32/34 clients,
    [AP_Lot] BIT NULL  -- in 32/34 clients,
    [LifeTime_Traceable] BIT NULL  -- in 32/34 clients,
    [Pregnant] BIT NULL  -- in 32/34 clients,
    [Planned_kill_date] DATETIME NULL  -- in 32/34 clients,
    [Beast_Sale_Type_ID] TINYINT NULL  -- in 32/34 clients,
    [ESI_Whold_until] DATETIME NULL  -- in 32/34 clients,
    [PregTested] BIT NULL  -- in 32/34 clients,
    [CustomFeedOwnerID] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 32/34 clients,
    [Species] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 32/34 clients,
    [NLIS_tag_fail_at_induction] BIT NULL  -- in 32/34 clients,
    [DNA_or_Blood_Number] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 32/34 clients,
    [DOF_scheduled] SMALLINT NULL  -- in 32/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 31/34 clients,
    [Marbling_bonus_lot] BIT NULL  -- in 31/34 clients,
    [Bovilus_Shots] SMALLINT NULL  -- in 31/34 clients,
    [Agisted_animal] BIT NULL  -- in 30/34 clients,
    [Program_ID] SMALLINT NULL  -- in 30/34 clients,
    [DOF_calc_date] DATETIME NOT NULL  -- in 1/34 clients,
    [Abattoir_Culled] BIT NULL  -- in 30/34 clients,
    [DOF_as_at_CalcDate] INT NOT NULL  -- in 1/34 clients,
    [Abattoir_Condemned] BIT NULL  -- in 30/34 clients,
    [DIP_as_at_CalcDate] INT NOT NULL  -- in 1/34 clients,
    [last_oracle_costs] REAL NULL  -- in 30/34 clients,
    [last_oracle_date] DATETIME NULL  -- in 30/34 clients,
    [Lot_closeout_date] DATETIME NULL  -- in 30/34 clients,
    [VendorID] INT NULL  -- in 29/34 clients,
    [AgentID] INT NULL  -- in 29/34 clients,
    [Outgoing_NVD] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 29/34 clients,
    [Paddock_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8)  -- in 12/34 clients,
    [EU] BIT NULL  -- in 3/34 clients,
    [Vendor_Treated_Bovilus] BIT NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Cattle] PRIMARY KEY ([BeastID])
);

-- Table found in 15 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_by_Location_Table] (
    [EntryMonth] NCHAR(10) NULL,
    [RV_Count] INT NULL,
    [RV_PrimeCost] REAL NULL,
    [RV_Feed_Cost] REAL NULL,
    [RV_OtherCosts] REAL NULL,
    [CustFL_Count] INT NULL,
    [CustFL_PrimeCost] REAL NULL,
    [CustFL_Feed_Cost] REAL NULL,
    [CustFL_OtherCosts] REAL NULL,
    [RV_FL_Entry_Wght] REAL NULL,
    [DOF_Scheduled] SMALLINT NULL  -- in 4/15 clients,
    [MOE] NVARCHAR(10) NULL  -- in 1/15 clients,
    [CustFL_Entry_Wght] REAL NULL  -- in 1/15 clients,
    [FL_Location] NVARCHAR(15) NULL  -- in 1/15 clients,
    [Group_Name_RV] NVARCHAR(15) NULL  -- in 1/15 clients,
    [FL_Entry_date] DATETIME NULL  -- in 1/15 clients
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_DOF_and_DIP] (
    [BeastID] INT NOT NULL,
    [DOF] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [DIP] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Date_Calculated] DATETIME NULL
    ,CONSTRAINT [PK_Cattle_DOF_and_DIP] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_Feed_Update] (
    [Pen_Number] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Feed_Date] DATETIME NULL,
    [Head] INT NULL  -- in 33/34 clients,
    [Dollars_Applied] REAL NULL  -- in 33/34 clients,
    [Kgs_Feed_As_Fed] REAL NULL  -- in 33/34 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 33/34 clients,
    [Ration_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 33/34 clients,
    [Head_Expected] SMALLINT NULL  -- in 33/34 clients,
    [Dollars_not_Applied] REAL NULL  -- in 33/34 clients,
    [Kgs_Not_Applied] REAL NULL  -- in 33/34 clients,
    [EstCurrWght] REAL NULL  -- types seen: BIGINT, REAL  -- in 33/34 clients,
    [DateApplied] DATETIME NULL  -- in 33/34 clients,
    [Run_Number] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 33/34 clients
    ,CONSTRAINT [PK_Cattle_Feed_Update] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_Photos] (
    [BeastID] INT NULL,
    [Ear_Tag] VARCHAR(10) NULL,
    [Photo] VARBINARY(MAX) NULL  -- types seen: IMAGE, VARBINARY(MAX),
    [DateLastUpdated] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Cattle_Photos] PRIMARY KEY ([ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_Program_Types] (
    [Program_ID] SMALLINT NOT NULL,
    [Program_Code] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [DOF] SMALLINT NULL,
    [Program_Description] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100)
    ,CONSTRAINT [PK_Cattle_Program_Types] PRIMARY KEY ([Program_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_Query_Month_Report_TAB] (
    [BeastID] INT NULL,
    [Current_LocType_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Start_Date] DATETIME NULL,
    [Weigh_date] DATETIME NULL,
    [Weighing_Type] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Weight] REAL NULL,
    [To_Locn_Type_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [To_From_Agistor] SMALLINT NULL,
    [Beast_sale_Type_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Cull_Reason_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [BE_Agist_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12), VARCHAR(7),
    [Lot_Number] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Purchase_date] DATETIME NULL,
    [PRIME_COST] REAL NULL,
    [Feed_Cost] REAL NULL,
    [Oheads_Cost] REAL NULL,
    [Other_Costs] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Mkt_Cat] VARCHAR(10) NULL
    ,CONSTRAINT [PK_Cattle_Query_Month_Report_TAB] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cattle_Specs] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Intake Fat From] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Intake Fat To] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Intake Wght From] SMALLINT NULL,
    [Intake Wght To] SMALLINT NULL,
    [Intake Teeth From] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Intake Teeth To] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Sale Wght From] SMALLINT NULL,
    [Sale Wght To] SMALLINT NULL,
    [WG per Day From] REAL NULL,
    [WG per Day To] REAL NULL,
    [Dressing % From] REAL NULL,
    [Dressing % To] REAL NULL,
    [Marbling>=] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Carc P8 From] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Carc P8 To] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [EMA From] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [EMA To] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Fat Colour From] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Fat Colour To] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Meat Colour From] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Meat Colour To] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Paddock WG From] REAL NULL,
    [Paddock WG To] REAL NULL,
    [DOF From] INT NULL,
    [DOF To] INT NULL
    ,CONSTRAINT [PK_Cattle_Specs] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [CattleProcessed] (
    [BeastID] INT NULL,
    [WeighDate] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [DraftGate] SMALLINT NULL  -- in 1/34 clients,
    [SavedDate] DATETIME NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_CattleProcessed] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Chemical_inventory] (
    [Chemical_Drug_ID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Purchase_Date] DATETIME NULL,
    [Purchase_Quantity] REAL NULL,
    [Units] VARCHAR(15) NULL,
    [Supplier] VARCHAR(30) NULL,
    [Batch_Number] VARCHAR(10) NULL,
    [ExpiryDate] DATETIME NULL,
    [Disposal_Comment] VARCHAR(50) NULL,
    [Stocktake_date] DATETIME NULL,
    [Stocktake_Qty] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Disposal_date] DATETIME NULL,
    [Disposal_Qty] REAL NULL,
    [Invoice_Amount] REAL NULL,
    [Invoice_Paid] BIT NULL
    ,CONSTRAINT [PK_Chemical_inventory] PRIMARY KEY ([ID])
);

-- Table found in 16 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, P&C and D&G Tuohey, Penna & Sons, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Chemical_inventory_old] (
    [Chemical_Drug_ID] SMALLINT NOT NULL,
    [Purchase_Date] VARCHAR(10) NOT NULL,
    [Purchase_Quantity] REAL NULL,
    [Units] VARCHAR(15) NOT NULL,
    [Supplier] VARCHAR(30) NOT NULL,
    [Batch_Number] VARCHAR(10) NOT NULL,
    [ExpiryDate] VARCHAR(10) NOT NULL,
    [Disposal_Comment] VARCHAR(50) NULL,
    [Stocktake_date] VARCHAR(10) NULL,
    [Stocktake_Qty] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Chemical_inventory_old] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Code_References_Index] (
    [Database_Table] NVARCHAR(40) NULL  -- types seen: NVARCHAR(40), VARCHAR(40),
    [Field_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Lookup_Table_Name] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [LUT_Descriptive_FieldName] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [LUT_Code_FieldName] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Code_References_Index] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Com_Port_Settings] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Scale_Com_Port] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Scale_Settings] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Scale_Type] SMALLINT NULL,
    [Scanner_Port] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Scanner_Settings] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [FatScanner_Port] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [FatScanner_Settings] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [EID_Port] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [EID_Settings] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [EID_Type] SMALLINT NULL,
    [Wand_Port] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Wand_Settings] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Wand_Type] SMALLINT NULL,
    [ProcType] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT
    ,CONSTRAINT [PK_Com_Port_Settings] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [CommodContracts] (
    [Contract_No] NVARCHAR(6) NOT NULL  -- types seen: NVARCHAR(10), NVARCHAR(6), VARCHAR(10), VARCHAR(6),
    [Supplier_AC_No] SMALLINT NOT NULL,
    [Commod_Code] SMALLINT NOT NULL,
    [Start_date] DATETIME NULL,
    [End_date] DATETIME NULL,
    [Price_ton] REAL NOT NULL,
    [Frght_ton] REAL NULL,
    [Notes] NTEXT NULL,
    [Wght_contracted] REAL NULL,
    [Wght_delivered] REAL NULL  -- in 23/28 clients,
    [Road_Levy_ton] REAL NULL  -- in 23/28 clients,
    [Contract_Complete] BIT NOT NULL  -- in 23/28 clients,
    [Pay_Suppliers_Weight] BIT NOT NULL  -- in 23/28 clients,
    [Specifications] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30)  -- in 23/28 clients,
    [Value_Incr_Per_Month] REAL NULL  -- in 23/28 clients,
    [Vendor_Dec] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 23/28 clients,
    [Kgs_Delivered_since_given_date] REAL NULL  -- in 22/28 clients,
    [Value_Delivered_since_given_date] REAL NULL  -- in 22/28 clients,
    [RTCI_invoice] BIT NOT NULL  -- in 22/28 clients,
    [FarmGatePrice] REAL NULL  -- in 22/28 clients,
    [Attachment_CVD] NVARCHAR(-1) NULL  -- in 2/28 clients,
    [Attachment_Contract] NVARCHAR(-1) NULL  -- in 2/28 clients
    ,CONSTRAINT [PK_CommodContracts] PRIMARY KEY ([Contract_No])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Commodities] (
    [Commodity_Code] SMALLINT NOT NULL,
    [Commod_Name] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Description] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Kgs_on_hand] REAL NULL,
    [Value_on_hand] REAL NULL,
    [Shrinkage_factor] REAL NULL  -- in 24/28 clients,
    [Mth_Open_Value] REAL NULL  -- in 24/28 clients,
    [Mth_Open_Kgs] REAL NULL  -- in 24/28 clients,
    [Superceeded] BIT NOT NULL  -- in 24/28 clients,
    [ShortName] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6)  -- in 24/28 clients,
    [NonStandard_Commodity] BIT NULL  -- in 23/28 clients,
    [Tempering_litres_per_kg] REAL NULL  -- in 23/28 clients
    ,CONSTRAINT [PK_Commodities] PRIMARY KEY ([Commodity_Code])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [CommodTrans] (
    [Commodity_Code] SMALLINT NULL,
    [Trans_Date] DATETIME NULL,
    [Ref_No] NVARCHAR(8) NOT NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Contract_No] NVARCHAR(6) NULL  -- types seen: NVARCHAR(10), NVARCHAR(6), VARCHAR(10), VARCHAR(6),
    [Trans_Type] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Value] REAL NULL,
    [Commod_Mast_Value] REAL NULL  -- in 22/28 clients,
    [Kgs] REAL NULL  -- in 22/28 clients,
    [Commod_Mast_Kgs] REAL NULL  -- in 22/28 clients,
    [Reason_Code] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 22/28 clients,
    [Feed_Load_Record_No] INT NULL  -- in 19/28 clients,
    [Month_End_process] BIT NOT NULL  -- in 19/28 clients,
    [CTR_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 19/28 clients,
    [Notes] NTEXT NULL  -- in 19/28 clients,
    [StaffID] SMALLINT NULL  -- in 19/28 clients,
    [Call_Weight] REAL NULL  -- in 19/28 clients,
    [Tempered_weight_fed_Kgs] REAL NULL  -- in 18/28 clients
    ,CONSTRAINT [PK_CommodTrans] PRIMARY KEY ([CTR_ID])
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [CommodTrans_Crosstab_Kgs] (
    [Commodity_Code] SMALLINT NULL,
    [1] FLOAT NOT NULL,
    [2] FLOAT NOT NULL,
    [3] FLOAT NOT NULL,
    [4] FLOAT NOT NULL,
    [5] FLOAT NOT NULL
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [CommodTrans_Crosstab_val] (
    [Commodity_Code] SMALLINT NULL,
    [1] FLOAT NOT NULL,
    [2] FLOAT NOT NULL,
    [3] FLOAT NOT NULL,
    [4] FLOAT NOT NULL,
    [5] FLOAT NOT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Company] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Company Name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Weight_Units] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [Key] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [UserTailTag] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [RFID_Space_Removed] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Apply_Feed_As_DM_Kgs] BIT NOT NULL,
    [CurrentNumberUsers] SMALLINT NULL,
    [Data_Collector_Scales_Type] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Scales_File_Folder] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Units_per_Ton] INT NULL,
    [Date_DB_Last_Updated] DATETIME NULL,
    [Last_Ohead_Application] DATETIME NULL,
    [V11_Database] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [DFLT_WG_Per_day] REAL NULL,
    [NSA_Cust_ID] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [NSA_Email] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [NSA_Client] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [User_logon] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Digistar_datalink] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Padd_Tail_Tag] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Date_Last_FeedTrans_Compression] DATETIME NULL,
    [Digistar_datakey] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 32/34 clients,
    [password_complexity] NVARCHAR(1) NOT NULL  -- types seen: CHAR(1), NVARCHAR(1)  -- in 29/34 clients,
    [ABN] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 29/34 clients,
    [ACN] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 29/34 clients,
    [Address] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100)  -- in 29/34 clients,
    [Phone] VARCHAR(15) NULL  -- in 29/34 clients,
    [Fax] VARCHAR(15) NULL  -- in 29/34 clients,
    [Email] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50)  -- in 29/34 clients,
    [Logo] VARBINARY(MAX) NULL  -- types seen: VARBINARY, VARBINARY(MAX)  -- in 12/34 clients,
    [titration_feeding] NVARCHAR(1) NOT NULL  -- in 3/34 clients
    ,CONSTRAINT [PK_Company] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Barmount
CREATE TABLE [Company_Settings] (
    [ModuleName] VARCHAR(100) NOT NULL,
    [SettingName] VARCHAR(100) NOT NULL,
    [SettingValue] VARCHAR(255) NULL,
    [DateCreated] DATETIME NULL,
    [DateModified] DATETIME NULL
    ,CONSTRAINT [PK_Company_Settings] PRIMARY KEY ([ModuleName], [SettingName])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Computer_Names] (
    [Computer_number] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY), SMALLINT,
    [Computer_name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50)
    ,CONSTRAINT [PK_Computer_Names] PRIMARY KEY ([Computer_number])
);

-- Table found in 1 client(s): Yarralinka Livestock Co
CREATE TABLE [Computer_Names_old] (
    [Computer_number] INT NOT NULL,
    [Computer_name] NVARCHAR(50) NULL
    ,CONSTRAINT [PK_Computer_Names_old] PRIMARY KEY ([Computer_number])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Contacts] (
    [Contact_ID] SMALLINT NOT NULL,
    [Company] NVARCHAR(50) NULL  -- types seen: NVARCHAR(25), NVARCHAR(50), VARCHAR(25), VARCHAR(50),
    [Last_Name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [First_Name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Salutation] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Address_1] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Address_2] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [City] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [State] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [PostCode] NVARCHAR(7) NULL  -- types seen: NVARCHAR(7), VARCHAR(7),
    [Tel_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Mobile_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Fax_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Email] NVARCHAR(30) NULL  -- types seen: CHAR(50), NVARCHAR(30), NVARCHAR(50), VARCHAR(50),
    [Tail_Tag_No] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Brand] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Contact_Type] SMALLINT NULL,
    [Notes] NTEXT NULL,
    [ABN] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Bank_BSB] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Bank_AC] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Days_invoice_due] SMALLINT NULL  -- in 33/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients,
    [brand_drawing_filename] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255)  -- in 30/34 clients,
    [Agistment_Paddock_Rate] REAL NULL  -- in 29/34 clients,
    [Agistment_Feedlot_Rate] REAL NULL  -- in 29/34 clients,
    [Invoice_careof] VARCHAR(50) NULL  -- in 19/34 clients,
    [Abattoir_Establishment_Number] NVARCHAR(-1) NULL  -- in 3/34 clients
    ,CONSTRAINT [PK_Contacts] PRIMARY KEY ([Contact_ID])
);

-- Table found in 29 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [ContactsContactTypes] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Contact_ID] INT NOT NULL,
    [Contact_Type_ID] INT NOT NULL
    ,CONSTRAINT [PK_ContactsContactTypes] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [ContactTypes] (
    [Contact_Type_ID] SMALLINT NOT NULL,
    [Contact_Type] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Description] VARCHAR(70) NULL  -- in 29/34 clients
    ,CONSTRAINT [PK_ContactTypes] PRIMARY KEY ([Contact_Type_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cost_Codes] (
    [RevExp_Code] SMALLINT NOT NULL,
    [RevExp_Desc] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Rev_Exp] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Include_in_Landed_Cost] BIT NULL,
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients,
    [Include_in_PL_expenses] BIT NULL  -- in 31/34 clients,
    [Include_on_CF_Invoice] BIT NULL  -- in 3/34 clients
    ,CONSTRAINT [PK_Cost_Codes] PRIMARY KEY ([RevExp_Code])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [Costings_for_oracle] (
    [BeastID] INT NOT NULL,
    [As_At_Date] DATETIME NOT NULL,
    [Costs_now] REAL NULL
    ,CONSTRAINT [PK_Costings_for_oracle] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Costs] (
    [BeastID] INT NOT NULL,
    [Ear_Tag] VARCHAR(8) NOT NULL,
    [RevExp_Code] SMALLINT NOT NULL,
    [Trans_Date] DATETIME NULL,
    [Rev_Exp_per_Unit] REAL NULL,
    [Units] REAL NULL,
    [Extended_RevExp] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Ration] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [RCGI_induction_transaction] BIT NULL,
    [RCGI_marbling_bonus] BIT NULL,
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_Costs] PRIMARY KEY ([ID])
);

-- Table found in 30 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Costs_Feed_Detail] (
    [BeastID] INT NOT NULL,
    [RevExp_Code] SMALLINT NOT NULL,
    [Date_Fed] DATETIME NOT NULL,
    [Rev_Exp_per_Unit] REAL NULL,
    [Units] REAL NULL,
    [Extended_RevExp] REAL NULL,
    [Ration] VARCHAR(10) NULL,
    [Custom_Feed_Charge_Ton] REAL NULL,
    [PenWhenFed] VARCHAR(10) NULL  -- types seen: VARCHAR(10), VARCHAR(6),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Units_DryMatter] REAL NOT NULL,
    [Paddock_Feed] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Forced_Application] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 28/30 clients
    ,CONSTRAINT [PK_Costs_Feed_Detail] PRIMARY KEY ([ID])
);

-- Table found in 18 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Costs_Feed_Detail_tmp] (
    [BeastID] INT NOT NULL,
    [RevExp_Code] SMALLINT NOT NULL,
    [Date_Fed] DATETIME NOT NULL,
    [Rev_Exp_per_Unit] REAL NULL,
    [Units] REAL NULL,
    [Extended_RevExp] REAL NULL,
    [Ration] VARCHAR(10) NULL,
    [Custom_Feed_Charge_Ton] REAL NULL,
    [PenWhenFed] VARCHAR(10) NULL  -- types seen: VARCHAR(10), VARCHAR(6),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Units_DryMatter] REAL NOT NULL,
    [Paddock_Feed] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Forced_application] VARCHAR(1) NULL  -- in 2/18 clients
    ,CONSTRAINT [PK_Costs_Feed_Detail_tmp] PRIMARY KEY ([ID])
);

-- Table found in 27 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Cust_Feed_Charges] (
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12), VARCHAR(7),
    [Ration] VARCHAR(10) NULL,
    [SumOfUnits] FLOAT NULL,
    [AvgOfCustom_Feed_Charge_Ton] FLOAT NULL,
    [Feed_Charge] FLOAT NULL
);

-- Table found in 33 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [CustFeed_Invoices_list] (
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Period_from] DATETIME NULL,
    [Period_To] DATETIME NULL,
    [Cattle_Owner] NVARCHAR(50) NULL  -- types seen: NVARCHAR(25), NVARCHAR(50), VARCHAR(25), VARCHAR(50),
    [Invoice_Number] NVARCHAR(18) NULL  -- types seen: NVARCHAR(18), VARCHAR(18),
    [Total_Charges] REAL NULL,
    [GST_rate] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Billing_Company] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(30), VARCHAR(50)  -- in 32/33 clients
    ,CONSTRAINT [PK_CustFeed_Invoices_list] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Custfeed_Lot_Summary] (
    [Purch_Lot_No] NVARCHAR(12) NOT NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Date_Started] DATETIME NULL,
    [Cattle_Class] VARCHAR(15) NULL,
    [Avg_In_Wght] REAL NULL,
    [Tag_Range] VARCHAR(20) NULL,
    [Head_In] SMALLINT NULL,
    [Deads] SMALLINT NULL,
    [Shipped] SMALLINT NULL,
    [Current_Hospital] SMALLINT NULL,
    [Current_Bullers] SMALLINT NULL,
    [Current_Non_Performers] SMALLINT NULL,
    [Current_Head] SMALLINT NULL,
    [Calender_Days_On_Feed_period] SMALLINT NULL,
    [Calender_Days_On_Feed_ToDate] SMALLINT NULL,
    [Avg_Days_in_Feed_Period] SMALLINT NULL,
    [Avg_Days_ToDate] SMALLINT NULL,
    [Avg_FeedCost_per_Hd_per_Day_Period] REAL NULL,
    [Avg_FeedCost_per_Hd_per_Day_ToDate] REAL NULL,
    [Feed_Charges_Period] REAL NULL,
    [Feed_Charges_ToDate] REAL NULL,
    [Head_Days_Period] INT NULL,
    [Head_Days_ToDate] INT NULL,
    [Kgs_Feed_Period] REAL NULL,
    [Kgs_Feed_ToDate] REAL NULL,
    [Induction_Costs_Period] REAL NULL,
    [Induction_Costs_ToDate] REAL NULL,
    [OtherCosts_Period] REAL NULL,
    [OtherCosts_ToDate] REAL NULL,
    [Cattle_Owner] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(30), VARCHAR(50),
    [Agist_Rate_per_day] REAL NULL,
    [Head_Arrived_in_Period] REAL NOT NULL,
    [Head_Shipped_in_Period] INT NOT NULL,
    [Head_at_Period_Start] INT NOT NULL,
    [Died_in_Period] INT NOT NULL,
    [Drugs_Costs_in_Period] REAL NOT NULL,
    [Drugs_Costs_to_date] REAL NOT NULL,
    [Comments] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100)  -- in 33/34 clients,
    [Cattle_owner_ID] SMALLINT NULL  -- in 33/34 clients,
    [Cattle_owner_details] NVARCHAR(150) NULL  -- types seen: NVARCHAR(150), VARCHAR(150)  -- in 33/34 clients,
    [Days_invoice_due] SMALLINT NULL  -- in 33/34 clients,
    [Agist_days_for_Period] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 32/34 clients,
    [Agist_days_to_date] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 32/34 clients,
    [Dry_Kgs_Feed_Period] REAL NULL  -- in 1/34 clients,
    [Dry_Kgs_Feed_ToDate] REAL NULL  -- in 1/34 clients
    ,CONSTRAINT [PK_Custfeed_Lot_Summary] PRIMARY KEY ([Purch_Lot_No])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Daily_Cattle_Inventory] (
    [Inventory_Date] DATETIME NOT NULL,
    [FL_Entries] INT NULL,
    [X_RV_Paddock] INT NULL,
    [FL_Deaths] SMALLINT NULL,
    [FL_Culls] SMALLINT NULL,
    [FL_Sales] INT NULL,
    [Calc_FL_Head] INT NULL  -- in 32/34 clients,
    [Actual_FL_Head] INT NULL  -- in 32/34 clients,
    [Accum_Month_HeadDays] INT NULL  -- in 32/34 clients
    ,CONSTRAINT [PK_Daily_Cattle_Inventory] PRIMARY KEY ([Inventory_Date])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Database_Flags] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Feed_Application_Running] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [BeastID_table_in_use] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ShowMenuPictures] VARCHAR(1) NOT NULL  -- in 19/34 clients,
    [Batch_Update_Running] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Locked_by_user_name_KF] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Locked_by_user_name_BU] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50)
);

-- Table found in 18 client(s): AAMIG, CH2 Pastoral, Coggan Agriculture, Conargo Feedlot, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Datakey_truck_allocation] (
    [Load_Number] SMALLINT NULL,
    [Ration_name] VARCHAR(15) NULL,
    [Feed_Cycle_No] TINYINT NULL  -- types seen: SMALLINT, TINYINT,
    [Truck_load_weight] REAL NULL,
    [Allocate_to_Datakey_number] TINYINT NULL  -- types seen: SMALLINT, TINYINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: BIGINT, INT (IDENTITY)
    ,CONSTRAINT [PK_Datakey_truck_allocation] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Date_Design_Last_Updated] (
    [Date_Design_Last_Updated] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Date_Design_Last_Updated] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [DB_Description] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [DB_Description] NVARCHAR(100) NOT NULL  -- types seen: NVARCHAR(100), VARCHAR(100)
    ,CONSTRAINT [PK_DB_Description] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [DeliveryDockets] (
    [Docket_Number] INT NOT NULL,
    [Docket_Date] DATETIME NULL,
    [Docket_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Commodity_Code] SMALLINT NULL,
    [Contract_No] NVARCHAR(6) NULL  -- types seen: NVARCHAR(10), NVARCHAR(6), VARCHAR(10), VARCHAR(6),
    [Carrier] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [DriverName] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Vehicle_ID] NVARCHAR(7) NULL  -- types seen: NVARCHAR(7), VARCHAR(7),
    [Gross_Wght] REAL NULL,
    [Tare_Wght] REAL NULL,
    [Payment_Wght] REAL NULL,
    [Grower] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Load_value] REAL NULL  -- in 23/28 clients,
    [Exit_date] DATETIME NULL  -- in 23/28 clients,
    [Exit_time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 23/28 clients,
    [Applied_to_Feed_System] BIT NOT NULL  -- in 23/28 clients,
    [Load_Rejected] BIT NOT NULL  -- in 23/28 clients,
    [DocketNotes] NTEXT NULL  -- in 23/28 clients,
    [Moisture] REAL NULL  -- in 23/28 clients,
    [Test_Wght_Kgs] REAL NULL  -- in 23/28 clients,
    [Screenings] REAL NULL  -- in 23/28 clients,
    [Field_Name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20)  -- in 23/28 clients,
    [DM_Pcnt] REAL NULL  -- in 23/28 clients,
    [WeighUnits] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 23/28 clients,
    [StaffID] SMALLINT NULL  -- in 23/28 clients,
    [Prch_or_Sale] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT  -- in 23/28 clients,
    [Road_Levy_per_ton] REAL NULL  -- in 23/28 clients,
    [Risk_category] SMALLINT NULL  -- in 23/28 clients,
    [Non_Standard_Commodity] BIT NOT NULL  -- in 23/28 clients,
    [Invoice_paid] BIT NULL  -- in 23/28 clients,
    [Discount_value_per_ton] REAL NULL  -- in 23/28 clients,
    [Contract_value_per_ton] REAL NULL  -- in 23/28 clients,
    [Vendor_Dec] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 23/28 clients,
    [Silo_Used] NVARCHAR(10) NULL  -- types seen: INT, NVARCHAR(10), SMALLINT  -- in 22/28 clients,
    [RTCI_invoice_done] BIT NOT NULL  -- in 22/28 clients,
    [Carrier_code] INT NULL  -- in 22/28 clients,
    [Freight_Cost] REAL NULL  -- in 22/28 clients,
    [RCTI_Freight_invoice_done] BIT NULL  -- in 22/28 clients,
    [RCTI_Freight_invoice_paid] BIT NULL  -- in 22/28 clients,
    [Protein] SMALLINT NULL  -- types seen: REAL, SMALLINT  -- in 21/28 clients,
    [No_of_bales] SMALLINT NULL  -- types seen: REAL, SMALLINT  -- in 21/28 clients,
    [Freight_per_ton] REAL NULL  -- in 20/28 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 22/28 clients,
    [Attachment] NVARCHAR(-1) NULL  -- in 1/28 clients
    ,CONSTRAINT [PK_DeliveryDockets] PRIMARY KEY ([Docket_Number], [ID])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [DeliveryDockets_basic] (
    [Docket_Number] NVARCHAR(6) NOT NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Docket_date] DATETIME NOT NULL,
    [Commodity_weight] REAL NOT NULL,
    [Notes] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Contract_number] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_value] REAL NOT NULL,
    [Commodity_code] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Vendor_Dec_Numbr] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Applied_to_feed_system] BIT NOT NULL,
    [Contract_value_per_ton] REAL NOT NULL,
    [WeighUnits] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_DeliveryDockets_basic] PRIMARY KEY ([ID])
);

-- Table found in 14 client(s): AAMIG, CH2 Pastoral, Glen Avon, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [Despatched_RFIDs] (
    [EID] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [Despatch_mob_name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Ear_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Group_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Group_colour] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Rejected] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [ProRata_weight] REAL NULL,
    [DOF] SMALLINT NULL,
    [Date_and_Time] DATETIME NULL,
    [Despatched] BIT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Despatched_RFIDs] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Digistar_Data_History] (
    [Truck] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Done] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Ingred_Pen] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Trck_Mill_loaded] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Load_number] NVARCHAR(4) NULL  -- types seen: INT, NVARCHAR(4), VARCHAR(4),
    [Commod_Pen] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Ration_Name] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Call_Wght] INT NULL,
    [Wght_delivered] INT NULL,
    [Driver_ID] SMALLINT NULL,
    [Time_done] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Date_format] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Head_count] INT NULL,
    [C15] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Zone] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Mix_time] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Truck_weight_now] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BatchBox] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3),
    [Feed_date] DATETIME NULL,
    [Last_Feed_for_pen] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)
    ,CONSTRAINT [PK_Digistar_Data_History] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Digistar_Datakey_Import_Table] (
    [Line] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [C1] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C2] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C3] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C4] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C5] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C6] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C7] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C8] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C9] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C10] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C11] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C12] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C13] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C14] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C15] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Digistar_Datakey_Import_Table] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Digistar_Import_Table] (
    [Line] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [C1] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C2] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C3] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C4] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C5] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C6] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C7] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C8] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C9] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C10] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C11] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C12] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C13] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C14] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C15] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C16] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C17] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C18] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C19] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C20] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C21] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C22] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C23] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C24] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C25] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BatchBox] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3)
    ,CONSTRAINT [PK_Digistar_Import_Table] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Digistar_Users] (
    [User_ID] SMALLINT NULL,
    [UserName] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Digistar_Users] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [DigistarExportDataFile] (
    [C1] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C2] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C3] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C4] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C5] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C6] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C7] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C8] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C9] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C10] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C11] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C12] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C13] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C14] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [C15] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_DigistarExportDataFile] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Diseases] (
    [Disease_ID] SMALLINT NOT NULL,
    [Disease_Name] NVARCHAR(25) NOT NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Symptoms] NTEXT NULL,
    [Treatment] NTEXT NULL,
    [Recoverable] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [BodySystemID] SMALLINT NULL,
    [PenApp_Disease_name] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25)  -- in 33/34 clients,
    [Autopsy_disease] BIT NULL  -- in 33/34 clients,
    [No_longer_used] BIT NOT NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_Diseases] PRIMARY KEY ([Disease_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [DocketsApplied] (
    [DocketNumber] INT NOT NULL
    ,CONSTRAINT [PK_DocketsApplied] PRIMARY KEY ([DocketNumber])
);

-- Table found in 1 client(s): Willow Bend Feedlot
CREATE TABLE [DOF_For_Period] (
    [BeastID] SMALLINT NULL,
    [Market_category] VARCHAR(10) NULL,
    [DOF] SMALLINT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Category] (
    [Drug_Category] SMALLINT NOT NULL,
    [Category_Description] NVARCHAR(150) NULL  -- types seen: NVARCHAR(150), VARCHAR(150)
    ,CONSTRAINT [PK_Drug_Category] PRIMARY KEY ([Drug_Category])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Disposal] (
    [Disposal_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [DrugID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Number_disposed] REAL NULL,
    [Date_disposed] DATETIME NOT NULL,
    [Disposal_reason] NVARCHAR(35) NULL  -- types seen: NVARCHAR(35), VARCHAR(35),
    [Disposal_method] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Disposed_by] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Notes] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Applied_to_Inventory] BIT NULL
    ,CONSTRAINT [PK_Drug_Disposal] PRIMARY KEY ([Disposal_ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_HGP_Forms] (
    [Drug_Receival_ID] INT NOT NULL,
    [HGP_Decl_Form_filename] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Drug_HGP_Forms] PRIMARY KEY ([ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Stocktake_records] (
    [Stocktake_ID] INT NOT NULL,
    [DrugID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Units_per_BoxOrBottle] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [On_hand_theoritical] REAL NULL,
    [Counted] REAL NULL,
    [Diffrence] REAL NULL,
    [Reorder_SOH_units_trigger] INT NULL,
    [Applied_to_SOH] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BoxBottles_OnHand] REAL NULL
    ,CONSTRAINT [PK_Drug_Stocktake_records] PRIMARY KEY ([ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Stocktakes] (
    [Stocktake_ID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Stock_Date] DATETIME NOT NULL,
    [Done_By] NVARCHAR(35) NULL  -- types seen: NVARCHAR(35), VARCHAR(35),
    [Notes] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255),
    [Applied_to_inventory] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Drug_Stocktakes] PRIMARY KEY ([ID])
);

-- Table found in 24 client(s): 2DE, Anna Plains Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Freestone Feedlot, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Transfer_Records] (
    [Transfer_ID] INT NOT NULL,
    [DrugID] SMALLINT NOT NULL,
    [Units_per_BoxOrBottle] INT NULL,
    [On_hand_theoretical] REAL NULL,
    [Transferred] REAL NULL,
    [Remaining] REAL NULL,
    [Reorder_SOH_units_trigger] INT NULL,
    [Applied_to_SOH] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BoxBottles_OnHand] REAL NULL
    ,CONSTRAINT [PK_Drug_Transfer_Records] PRIMARY KEY ([ID])
);

-- Table found in 24 client(s): 2DE, Anna Plains Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Freestone Feedlot, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drug_Transfers] (
    [Transfer_ID] INT NOT NULL,
    [Transfer_Date] DATETIME NOT NULL,
    [Transfer_Location] NVARCHAR(35) NULL  -- types seen: NVARCHAR(35), VARCHAR(35),
    [Done_By] NVARCHAR(35) NULL  -- types seen: NVARCHAR(35), VARCHAR(35),
    [Notes] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255),
    [Applied_to_inventory] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Drug_Transfers] PRIMARY KEY ([ID])
);

-- Table found in 3 client(s): Conargo Feedlot, Rangers Valley, Wanderribby Feedlot
CREATE TABLE [Drug_Usage_Analysis] (
    [Drug_Name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Opening_Stock] REAL NULL,
    [Opening_stock_date] DATETIME NULL,
    [Purchases] REAL NULL,
    [Drug_Usage] REAL NULL,
    [Disposal_qty] REAL NULL,
    [Closing_Stock] REAL NULL,
    [Closing_stock_date] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Drug_Usage_Analysis] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drugs] (
    [Drug_ID] SMALLINT NOT NULL,
    [Drug_Name] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Units] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Cost_per_unit] REAL NULL,
    [WithHold_days_1] SMALLINT NULL,
    [WithHold_days_ESI] SMALLINT NULL  -- in 33/34 clients,
    [WithHold_days_3] SMALLINT NULL  -- in 33/34 clients,
    [WithHold_days_4] SMALLINT NULL  -- in 33/34 clients,
    [Supplier] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25)  -- in 33/34 clients,
    [Notes] NTEXT NULL  -- in 33/34 clients,
    [Drug_Category] SMALLINT NULL  -- in 33/34 clients,
    [HGP] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Antibiotic] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Admin_units] REAL NULL  -- in 33/34 clients,
    [Admin_weight_Factor] REAL NULL  -- in 33/34 clients,
    [Current_Batch_Numb] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 33/34 clients,
    [Inactive] BIT NULL  -- in 33/34 clients,
    [Cost_per_Unit_CF] REAL NULL  -- in 33/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 32/34 clients,
    [Chemical_Mg_per_Ml] SMALLINT NULL  -- in 31/34 clients,
    [Reorder_SOH_units_trigger] INT NULL  -- in 30/34 clients,
    [Minimum_ReOrder_Qty] INT NULL  -- in 1/34 clients,
    [Units_per_BoxOrBottle] INT NULL  -- in 30/34 clients,
    [Units_on_hand] REAL NULL  -- types seen: INT, REAL  -- in 30/34 clients
    ,CONSTRAINT [PK_Drugs] PRIMARY KEY ([Drug_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drugs_Given] (
    [BeastID] INT NOT NULL,
    [Ear_Tag_No] VARCHAR(8) NOT NULL,
    [Drug_ID] SMALLINT NULL,
    [Batch_No] VARCHAR(10) NULL,
    [Date_Given] DATETIME NULL,
    [Time_Given] VARCHAR(5) NULL,
    [Units_Given] REAL NULL,
    [Drug_Cost] REAL NULL,
    [Withold_Until] DATETIME NULL  -- in 33/34 clients,
    [Date_next_Dose] DATETIME NULL  -- in 33/34 clients,
    [SB_Rec_No] INT NULL  -- in 33/34 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 33/34 clients,
    [WithHold_date_ESI] DATETIME NULL  -- in 33/34 clients,
    [User_Initials] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 33/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 32/34 clients,
    [Where_given] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 32/34 clients,
    [Applied_to_StockOnHand] BIT NULL  -- in 30/34 clients
    ,CONSTRAINT [PK_Drugs_Given] PRIMARY KEY ([ID])
);

-- Table found in 14 client(s): Avondale Feedlot, Barmount, CH2 Pastoral, Conargo Feedlot, Demonstration Database, Glen Avon, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drugs_Given_temp] (
    [BeastID] INT NOT NULL,
    [Ear_Tag_No] VARCHAR(8) NOT NULL,
    [Drug_ID] SMALLINT NULL,
    [Batch_No] VARCHAR(10) NULL,
    [Date_Given] DATETIME NULL,
    [Time_Given] VARCHAR(5) NULL,
    [Units_Given] REAL NULL,
    [Drug_Cost] REAL NULL,
    [Withold_Until] DATETIME NULL,
    [Date_next_Dose] DATETIME NULL,
    [SB_Rec_No] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [WithHold_date_ESI] DATETIME NULL,
    [User_Initials] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Last_Modified_timestamp] DATETIME NULL,
    [Where_given] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Applied_to_StockOnHand] BIT NULL  -- in 10/14 clients
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drugs_Purchase_event] (
    [Drug_Receival_ID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Date_received] DATETIME NOT NULL,
    [Supplier_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Order_ref_number] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Received_by] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Invoice_paid] BIT NULL,
    [Notes] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Applied_to_Inventory] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [HGP_form_done] BIT NULL
    ,CONSTRAINT [PK_Drugs_Purchase_event] PRIMARY KEY ([ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Drugs_Purchased] (
    [Receival_ID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [DrugID] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Quantity_received] REAL NULL,
    [Batch_number] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Expiry_date] DATETIME NULL,
    [Drug_cost] REAL NULL,
    [Applied_to_SOH] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Drugs_Purchased] PRIMARY KEY ([ID])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Dual_Ration_Feeding] (
    [Pen_Number_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Feed_date] DATETIME NULL,
    [Ration_Name_Feed1] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed1] SMALLINT NULL,
    [Ration_Pcnt_Feed1] REAL NULL,
    [Ration_Name_Feed2] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed2] SMALLINT NULL,
    [Ration_Pcnt_Feed2] REAL NULL,
    [Ration_Name_Feed3] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed3] SMALLINT NULL,
    [Ration_Pcnt_Feed3] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: BIGINT, INT (IDENTITY)
    ,CONSTRAINT [PK_Dual_Ration_Feeding] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Error_Log] (
    [Event_date] DATETIME NULL,
    [Mod_ule] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Proceedure_Name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Error_Code] INT NULL,
    [Error_message] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255),
    [User_Number] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [e_value] SMALLINT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Error_Log] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feed_Card_Report_Data] (
    [Load_Number] SMALLINT NULL,
    [Ration_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Feed_Cycle_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Pen_Name] NVARCHAR(12) NULL  -- types seen: NVARCHAR(10), NVARCHAR(12), VARCHAR(12),
    [Pen_Kgs_Feed] REAL NULL,
    [Scale_Reading_After_Discharge] REAL NULL,
    [Commodity] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Scale_Reading_After_Loading] REAL NULL,
    [Commodity_Weight] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [CommodCode] SMALLINT NULL,
    [Ration_Type] SMALLINT NULL,
    [Feed_date] DATETIME NOT NULL,
    [Forced_one_feed_only] BIT NOT NULL  -- in 27/28 clients
    ,CONSTRAINT [PK_Feed_Card_Report_Data] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feed_Commodity_names] (
    [Commodity_Code] SMALLINT NOT NULL  -- types seen: INT, SMALLINT,
    [Commodity_Name] VARCHAR(15) NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Feed_Commodity_names] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feed_Month_End_date] (
    [Current_MonthEnd_Date] DATETIME NULL,
    [Current_MonthStart_Date] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Feed_Month_End_date] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feed_Totals_By_Ration] (
    [BeastID] INT NULL,
    [Ration] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(10), VARCHAR(8),
    [KgsFed] REAL NULL,
    [FeedCost] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Units_DryMatter] REAL NOT NULL
    ,CONSTRAINT [PK_Feed_Totals_By_Ration] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [FeedDB_Pens_File] (
    [Pen_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [IsPaddock] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Include_in_Pen_List] BIT NULL,
    [Current_exit_pen] BIT NULL  -- in 32/34 clients
    ,CONSTRAINT [PK_FeedDB_Pens_File] PRIMARY KEY ([Pen_name])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feeding_Order_for_day] (
    [Ration_Type_ID] SMALLINT NOT NULL,
    [Ration_Type] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [FeedingOrder] SMALLINT NOT NULL,
    [Truck_Volume_m3] REAL NULL,
    [Truck_Max_Load_Kgs] REAL NULL,
    [Feed_pcnt_cycle_1] REAL NULL,
    [Feed_pcnt_cycle_2] REAL NULL,
    [Feed_pcnt_cycle_3] REAL NULL,
    [TruckName] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Minimum_load_allowed] REAL NULL,
    [Feed_pcnt_cycle_4] REAL NULL,
    [Force_One_load_if_under_X_Kilos] SMALLINT NULL  -- in 26/28 clients,
    [Force_One_load_if_under_X_Head] SMALLINT NULL  -- in 26/28 clients
    ,CONSTRAINT [PK_Feeding_Order_for_day] PRIMARY KEY ([Ration_Type_ID])
);

-- Table found in 14 client(s): Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, KO Beef, Penna & Sons, Rangers Valley, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feeding_time_data] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Feed_Date] DATETIME NULL,
    [First_pen_Fed] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [First_pen_Fed_time] DATETIME NULL,
    [Ten_day_avg_start_time] DATETIME NULL,
    [Last_pen_Fed] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Last_pen_Fed_time] DATETIME NULL,
    [Ten_day_avg_End_time] DATETIME NULL,
    [Total_feeding_time] DATETIME NULL,
    [Total_Tons_Fed] REAL NULL,
    [Tons_per_hour] REAL NULL
    ,CONSTRAINT [PK_Feeding_time_data] PRIMARY KEY ([ID])
);

-- Table found in 13 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Rangers Valley, Reid River Export, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [Feeding_Time_Taken_By_Ration_Type] (
    [Feed_Date] DATETIME NULL,
    [Cycle] VARCHAR(1) NULL,
    [Ration_Type] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [SumOfWght_Delivered] INT NULL,
    [First_Pen_Fed] VARCHAR(10) NULL,
    [First_Pen_Feed_Time] VARCHAR(5) NULL,
    [Last_Pen_Fed] VARCHAR(10) NULL,
    [Last_Pen_Feed_Time] VARCHAR(5) NULL,
    [NumberPens] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Feeding_Time_Taken_By_Ration_Type] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Feedlot_Staff] (
    [User_ID] SMALLINT NOT NULL,
    [Surname] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [FirstName] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), NVARCHAR(20), VARCHAR(15), VARCHAR(20),
    [Job_Desc] NVARCHAR(50) NULL  -- types seen: NVARCHAR(15), NVARCHAR(50), VARCHAR(15), VARCHAR(50),
    [Start_date] DATETIME NULL,
    [Finish_Date] DATETIME NULL  -- in 33/34 clients,
    [Pass_word] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20)  -- in 33/34 clients,
    [Cattle_Data_Entry] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Cattle_Reports] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Cattle_Utilities] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Cattle_Lookup_Tables] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Feed_system_Data_Entry] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Feed_system_reports] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Feed_system_utilities] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [PL_Reports_Allowed] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Pen_Rider] BIT NULL  -- in 33/34 clients,
    [Cattle_Deletes] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 33/34 clients,
    [Password_Last_Changed_Date] DATETIME NULL  -- in 29/34 clients
    ,CONSTRAINT [PK_Feedlot_Staff] PRIMARY KEY ([User_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Field_Names_Foreign_Conversion] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [CountryLocale] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [DatabaseFieldName] NVARCHAR(40) NULL  -- types seen: NVARCHAR(40), VARCHAR(40),
    [ForeignFieldName] NVARCHAR(40) NULL  -- types seen: NVARCHAR(40), VARCHAR(40)
    ,CONSTRAINT [PK_Field_Names_Foreign_Conversion] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [GE150_Feeding_Details] (
    [Feeding_Regimen_ID] SMALLINT NOT NULL,
    [Bunk_Codes_Total] SMALLINT NULL  -- in 21/28 clients,
    [Kgs_Head_Adj] REAL NULL  -- in 21/28 clients,
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 21/28 clients
    ,CONSTRAINT [PK_GE150_Feeding_Details] PRIMARY KEY ([Rec_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [GE150_Feeding_Regimens] (
    [Ration_Type] SMALLINT NOT NULL,
    [Consump_per_head_From] REAL NULL  -- in 23/28 clients,
    [Consump_per_head_To] REAL NULL  -- in 23/28 clients,
    [Accum_BunkCode_days] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 23/28 clients,
    [Feeding_Regimen_ID] SMALLINT NOT NULL  -- in 23/28 clients
    ,CONSTRAINT [PK_GE150_Feeding_Regimens] PRIMARY KEY ([Feeding_Regimen_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [GraphImage] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [GraphImage] VARBINARY(MAX) NULL  -- types seen: IMAGE, VARBINARY(MAX)
    ,CONSTRAINT [PK_GraphImage] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [GraphTable] (
    [BeastID] INT NOT NULL,
    [Ear_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Tail_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [WGD] REAL NULL,
    [Date1] DATETIME NULL,
    [Weight1] REAL NULL,
    [Date2] DATETIME NULL,
    [Weight2] REAL NULL
    ,CONSTRAINT [PK_GraphTable] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Grower_Groups] (
    [GrowerGroup_Code] SMALLINT NOT NULL,
    [GrowerGroup_Name] NVARCHAR(25) NOT NULL  -- types seen: NVARCHAR(25), VARCHAR(25)
    ,CONSTRAINT [PK_Grower_Groups] PRIMARY KEY ([GrowerGroup_Code])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Head_By_Disease] (
    [Body_System] VARCHAR(20) NULL,
    [Disease_name] VARCHAR(25) NULL,
    [Total_Head] INT NULL,
    [Recovered] INT NULL,
    [Paddock] INT NULL,
    [Sold] INT NULL,
    [Died] INT NULL,
    [Treated_and_Died] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Head_By_Disease] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Head_by_pen_Comparison] (
    [Feed_Pen_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [CattleFile_GroupName] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(15),
    [CattleFileHead] INT NULL,
    [Cattle_DOF] INT NULL,
    [Cattle_HeadDays] INT NULL,
    [Feed_PenFile_Mobname] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Feed_PenFile_head] SMALLINT NULL,
    [Feed_Ration_ID] SMALLINT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Head_by_pen_Comparison] PRIMARY KEY ([ID])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Instrument_Calibration_tests] (
    [Instrument_name] NVARCHAR(30) NOT NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Test_date] DATETIME NOT NULL,
    [Testing_method] NVARCHAR(50) NOT NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Tester_name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Test_Notes] NVARCHAR(100) NOT NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Data_applied_to_instruments] BIT NULL  -- in 28/31 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Instrument_Calibration_tests] PRIMARY KEY ([ID])
);

-- Table found in 5 client(s): AAMIG, Moruya Feedlot, Reid River Export, Semini, Willow Bend Feedlot
CREATE TABLE [Instrument_Calibrations] (
    [Instrument_name] VARCHAR(30) NULL,
    [Testing_Frequency] VARCHAR(10) NULL,
    [Date_last_tested] DATETIME NULL,
    [Testing_method] VARCHAR(50) NULL,
    [Inactive] BIT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Instruments_needing_Calibration] (
    [Instrument_name] NVARCHAR(30) NOT NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Testing_Frequency] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Date_last_tested] DATETIME NOT NULL,
    [Testing_method] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Inactive] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Instruments_needing_Calibration] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [KD1_Records] (
    [Ear_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Weight] REAL NULL,
    [Hash] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [IDENT] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [EID] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Error_Mess] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Group] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Teeth] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Weigh_Note] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Sex] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Pen_Number] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [P8_Fat] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Add_or_Update] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Supplier_EarTag] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Rudd800_Traits] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Lot_Number] NVARCHAR(7) NULL  -- types seen: NVARCHAR(7), VARCHAR(7)
    ,CONSTRAINT [PK_KD1_Records] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [L150_Feeding_Details] (
    [Feeding_Regimen_ID] SMALLINT NOT NULL,
    [Bunk_Codes_Total] SMALLINT NULL  -- in 23/28 clients,
    [Kgs_Head_Adj] REAL NULL  -- in 23/28 clients,
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 23/28 clients
    ,CONSTRAINT [PK_L150_Feeding_Details] PRIMARY KEY ([Rec_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [L150_Feeding_Regimens] (
    [Ration_Type] SMALLINT NOT NULL,
    [Consump_per_head_From] REAL NULL  -- in 20/28 clients,
    [Consump_per_head_To] REAL NULL  -- in 20/28 clients,
    [Accum_BunkCode_days] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 20/28 clients,
    [Feeding_Regimen_ID] SMALLINT NOT NULL  -- in 20/28 clients
    ,CONSTRAINT [PK_L150_Feeding_Regimens] PRIMARY KEY ([Feeding_Regimen_ID])
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Last_7_Days_Pulls_Headcounts] (
    [Pen] NVARCHAR(10) NULL,
    [HeadAtStart] INT NULL,
    [Head_n_Days_Ago] INT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [List of_Devices to be made Inactive] (
    [Column 0] VARCHAR(20) NULL
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Livestock_Weighbridge_Dockets] (
    [DocketID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Docket_Number] INT NOT NULL,
    [Docket_Type] INT NULL,
    [Docket_Date] DATETIME NULL,
    [Docket_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Exit_Date] DATETIME NULL,
    [Exit_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [WeighpersonID] INT NULL,
    [CarrierID] INT NULL,
    [Driver_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Vehicle_Rego] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30), VARCHAR(7),
    [Origin_DestinationID] INT NULL,
    [Description] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [NVD_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Purch_Lot_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Head_Count] INT NULL,
    [Animal_Welfare] BIT NULL,
    [WeighUnits] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Gross_Weight] REAL NULL,
    [Tare_Weight] REAL NULL,
    [Shrink_Percent] REAL NULL,
    [Notes] NTEXT NULL
    ,CONSTRAINT [PK_Livestock_Weighbridge_Dockets] PRIMARY KEY ([DocketID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [LoadDockageReasons] (
    [Reason_ID] SMALLINT NOT NULL,
    [Dockage_Reason] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20)
    ,CONSTRAINT [PK_LoadDockageReasons] PRIMARY KEY ([Reason_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [LoadDockages] (
    [Docket_No] INT NOT NULL,
    [Reason_Code] SMALLINT NOT NULL,
    [Tons] REAL NULL  -- in 20/28 clients,
    [Rate_per_Ton] MONEY NULL  -- in 20/28 clients,
    [Dockage_Value] MONEY NULL  -- in 20/28 clients,
    [Dockage_Pcnt] REAL NULL  -- in 20/28 clients,
    [Authorised_By] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 20/28 clients,
    [Notes] NTEXT NULL  -- in 20/28 clients,
    [Commodity_code] SMALLINT NULL  -- in 19/28 clients
    ,CONSTRAINT [PK_LoadDockages] PRIMARY KEY ([Docket_No])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Location_Changes] (
    [BeastID] INT NOT NULL,
    [Ear_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [EID] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [Movement_Date] DATETIME NOT NULL,
    [From_location] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [From_location_ID] INT NULL  -- in 1/31 clients,
    [To_Location] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [To_Location_ID] INT NULL  -- in 1/31 clients,
    [New_animal] BIT NULL,
    [Slaughtered] BIT NULL,
    [Sent_to_oracle] BIT NULL,
    [Sent_to_oracle_date] DATETIME NULL  -- types seen: DATE, DATETIME,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Program_ID] SMALLINT NULL  -- in 30/31 clients
    ,CONSTRAINT [PK_Location_Changes] PRIMARY KEY ([ID])
);

-- Table found in 26 client(s): AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Location_Transactions] (
    [Trans_Date] DATETIME NULL,
    [Delivery_docket_number] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 23/26 clients,
    [From_Location_code] SMALLINT NULL,
    [Commodity] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20)  -- in 23/26 clients,
    [To_Location_code] SMALLINT NULL,
    [Trans_Tons] REAL NULL,
    [Trans_Value] REAL NULL,
    [Comments] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Applied_to_storage_totals] BIT NOT NULL  -- in 23/26 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT (IDENTITY), SMALLINT
    ,CONSTRAINT [PK_Location_Transactions] PRIMARY KEY ([ID])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Locations] (
    [Location_ID] SMALLINT NOT NULL,
    [Location_name] NVARCHAR(30) NOT NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Location_Type] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Commodity] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20)  -- in 25/27 clients,
    [Tons_stored] REAL NULL,
    [Value_stored] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT (IDENTITY), SMALLINT
    ,CONSTRAINT [PK_Locations] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [LocationTypes] (
    [Loc_Type_code] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Location_Type] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), NVARCHAR(20), VARCHAR(15), VARCHAR(20)
    ,CONSTRAINT [PK_LocationTypes] PRIMARY KEY ([Loc_Type_code])
);

-- Table found in 2 client(s): Barmount, Demonstration Database
CREATE TABLE [Log_Pens_File] (
    [LogID] INT NOT NULL,
    [ChangeType] CHAR(15) NULL,
    [ChangeDate] DATETIME NULL,
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_Name] NVARCHAR(10) NOT NULL,
    [Mob_Name] NVARCHAR(8) NULL,
    [Numb_Head] SMALLINT NOT NULL,
    [Ration_Code] INT NULL,
    [Kgs_Head] REAL NULL,
    [Feeding_System] SMALLINT NULL,
    [Inc_in_Plateau_Feed] BIT NOT NULL,
    [Excel_Cell] NVARCHAR(5) NULL,
    [DateEnteredFeedlot] DATETIME NULL,
    [Bunk_Volume] REAL NULL,
    [IsPaddock] NVARCHAR(1) NULL,
    [Expected_WG_Day] REAL NULL,
    [Date_last_cleaned] NVARCHAR(10) NULL,
    [Ration_Code_PM] SMALLINT NULL,
    [Exclude_from_feed_generation] BIT NULL,
    [Titration_Regime] NVARCHAR(15) NULL,
    [Titration_Regime_Start_date] DATETIME NULL
    ,CONSTRAINT [PK_Log_Pens_File] PRIMARY KEY ([LogID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Manure_carting] (
    [Load_Date] DATETIME NOT NULL,
    [Truck_name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Operator] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [From_location] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [To_Location] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Tons_Nett_weight] REAL NOT NULL,
    [Number_of_loads] SMALLINT NOT NULL,
    [Notes] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Manure_type] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)
    ,CONSTRAINT [PK_Manure_carting] PRIMARY KEY ([ID])
);

-- Table found in 21 client(s): AAMIG, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Rangers Valley, Reid River Export, Tonkin Farming, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Manure_From_Locations] (
    [From_Location] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Manure_From_Locations] PRIMARY KEY ([ID])
);

-- Table found in 21 client(s): AAMIG, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Rangers Valley, Reid River Export, Tonkin Farming, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Manure_To_Locations] (
    [To_Location] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Manure_To_Locations] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Manure_Types] (
    [Manure_Type] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Manure_Types] PRIMARY KEY ([ID])
);

-- Table found in 16 client(s): AAMIG, Avondale Feedlot, CH2 Pastoral, Glen Avon, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Wanderribby Feedlot, Willow Bend Feedlot
CREATE TABLE [Marbling_bonus] (
    [Marbling_score] TINYINT NULL,
    [Pay_rate_bonus_per_carcase_Kg] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Marbling_bonus] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Market_Category] (
    [Market_Cat_ID] SMALLINT NOT NULL,
    [Market_Category] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Min_DOF] SMALLINT NULL,
    [Predicted_dressing_pcnt] REAL NULL  -- in 33/34 clients,
    [HGP_Free] BIT NULL  -- in 29/34 clients,
    [Dispatch_Notes] NTEXT NULL  -- in 29/34 clients
    ,CONSTRAINT [PK_Market_Category] PRIMARY KEY ([Market_Cat_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [MMEC_Table] (
    [DOF] INT NULL,
    [Target_Multiplier] REAL NULL,
    [Max_Multiplier] REAL NULL,
    [Bump_If_Slick] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_MMEC_Table] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Month_End_StockOnHand] (
    [Month_End_Date] DATETIME NOT NULL,
    [SOH_Head] INT NULL,
    [SOH_Prime_Cost] MONEY NULL,
    [SOH_Feed_Cost] MONEY NULL,
    [SOH_Oheads_Cost] MONEY NULL,
    [Total_Costs] MONEY NULL
    ,CONSTRAINT [PK_Month_End_StockOnHand] PRIMARY KEY ([Month_End_Date])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_Adjustment_OB] (
    [Month_End_Date] DATETIME NOT NULL,
    [Head] INT NULL,
    [Prime_Cost] MONEY NULL,
    [Feed_Cost] MONEY NULL,
    [Other_Costs] MONEY NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Monthly_Adjustment_OB] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_Agistor_Movements] (
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Month_End_Date] DATETIME NULL,
    [Agistor_ID] INT NULL,
    [Seq_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Section_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Head] INT NULL,
    [Prime_Cost] MONEY NULL
    ,CONSTRAINT [PK_Monthly_Agistor_Movements] PRIMARY KEY ([Rec_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_Feedlot_Reconciliation] (
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Month_End_Date] DATETIME NULL,
    [Seq_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Section_Heading] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Section_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Head] INT NULL,
    [Prime_Cost] MONEY NULL,
    [Feed_Cost] MONEY NULL,
    [Other_Costs] MONEY NULL,
    [Total_Costs] MONEY NULL
    ,CONSTRAINT [PK_Monthly_Feedlot_Reconciliation] PRIMARY KEY ([Rec_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_FL_Intake_Cost] (
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Month_End_Date] DATETIME NULL,
    [Group_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Seq_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Section_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Head] INT NULL,
    [Prime_Cost] MONEY NULL,
    [Intake_Kgs] INT NULL
    ,CONSTRAINT [PK_Monthly_FL_Intake_Cost] PRIMARY KEY ([Rec_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_Movements] (
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Month_End_Date] DATETIME NULL,
    [Section_Seq_Number] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [Section_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30)  -- in 32/34 clients,
    [Sub_Section] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30)  -- in 32/34 clients,
    [Culls_Head] INT NULL  -- in 32/34 clients,
    [Culls_Kgs] INT NULL  -- in 32/34 clients,
    [Culls_PrimeCost] MONEY NULL  -- in 32/34 clients,
    [Culls_Feed_Cost] MONEY NULL  -- in 32/34 clients,
    [Culls_Other_Costs] MONEY NULL  -- in 32/34 clients,
    [RV_Agist_Head] INT NULL  -- in 32/34 clients,
    [RV_Agist_Kgs] INT NULL  -- in 32/34 clients,
    [RV_Agist_PrimeCost] MONEY NULL  -- in 32/34 clients,
    [RV_Agist_Feed_Cost] MONEY NULL  -- in 32/34 clients,
    [RV_Agist_Other_Costs] MONEY NULL  -- in 32/34 clients,
    [FeedLot_Head] INT NULL  -- in 32/34 clients,
    [Feedlot_Kgs] INT NULL  -- in 32/34 clients,
    [FeedLot_PrimeCost] MONEY NULL  -- in 32/34 clients,
    [FeedLot_Feed_Cost] MONEY NULL  -- in 32/34 clients,
    [FeedLot_Other_Costs] MONEY NULL  -- in 32/34 clients,
    [Agist_Head] INT NULL  -- in 32/34 clients,
    [Agist_Kgs] INT NULL  -- in 32/34 clients,
    [Agist_PrimeCost] MONEY NULL  -- in 32/34 clients,
    [Agist_Feed_Cost] MONEY NULL  -- in 32/34 clients,
    [Agist_Other_Costs] MONEY NULL  -- in 32/34 clients,
    [Cust_Feedlot_Head] INT NULL  -- in 32/34 clients,
    [Cust_Feedlot_Kgs] INT NULL  -- in 32/34 clients,
    [Cust_Feedlot_PrimeCost] MONEY NULL  -- in 32/34 clients,
    [Cust_Feedlot_Feed_Cost] MONEY NULL  -- in 32/34 clients,
    [Cust_Feedlot_Other_Costs] MONEY NULL  -- in 32/34 clients
    ,CONSTRAINT [PK_Monthly_Movements] PRIMARY KEY ([Rec_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Monthly_RV_Agist_Reconciliation] (
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Month_End_Date] DATETIME NULL,
    [Seq_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Section_Heading] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Section_Name] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [Head] INT NULL,
    [Prime_Cost] MONEY NULL
    ,CONSTRAINT [PK_Monthly_RV_Agist_Reconciliation] PRIMARY KEY ([Rec_ID])
);

-- Table found in 26 client(s): AAMIG, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Glen Avon, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Mort_Morb_triggers] (
    [TableName] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [COF_From] INT NULL,
    [COF_to] INT NULL,
    [Pulls_actual] INT NULL,
    [Deaths_actual] INT NULL,
    [Level1_Pulls_trigger] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Level1_Deaths_trigger] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Level2_Deaths_trigger] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Level3_Deaths_trigger] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Include_in_report] BIT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Mort_Morb_triggers] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [MRB_AVG_Supplier_Years] (
    [Supplier_ID] INT NULL,
    [Supplier] VARCHAR(25) NULL,
    [MRB_Avg_YR1] REAL NULL,
    [MRB_Avg_YR2] REAL NULL,
    [MRB_Avg_YR3] REAL NULL,
    [MRB_Avg_YR4] REAL NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_MRB_AVG_Supplier_Years] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [New_cattle_records_Log] (
    [BeastID] INT NULL,
    [Date_record_added] DATETIME NULL,
    [Mod_ule] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Proceedure_Name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [User_Number] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [EarTag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [EID] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16)
    ,CONSTRAINT [PK_New_cattle_records_Log] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [NSA_Bunk_Data] (
    [TheDate] DATETIME NOT NULL,
    [Lot_Number] NVARCHAR(12) NULL  -- types seen: NVARCHAR(10), NVARCHAR(12), VARCHAR(12),
    [Pen_name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [HeadCount] SMALLINT NULL,
    [MktCat] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [MktSubCat] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Sex] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3),
    [Avg_Current_Wght] REAL NULL  -- in 23/28 clients,
    [Ration_ID] SMALLINT NULL  -- in 23/28 clients,
    [Feed_last_24_Hrs] REAL NULL  -- in 23/28 clients,
    [Seven_Day_Avg] REAL NULL  -- in 23/28 clients,
    [Fourteen_Day_Avg] REAL NULL  -- in 23/28 clients,
    [Implanted] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 23/28 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 23/28 clients,
    [Dry_Matter_percent] REAL NULL  -- in 22/28 clients,
    [ME_MJ_kg_Dry] REAL NULL  -- in 22/28 clients,
    [NEm_Dry] REAL NULL  -- in 22/28 clients,
    [NEg_Dry] REAL NULL  -- in 22/28 clients,
    [CP_Percentage_Dry] REAL NULL  -- in 22/28 clients,
    [Effective_from_date] DATETIME NULL  -- in 22/28 clients,
    [Ration_Short_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 22/28 clients,
    [Ration_Description] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 22/28 clients,
    [Bunk_call] REAL NULL  -- types seen: INT, REAL  -- in 15/28 clients
    ,CONSTRAINT [PK_NSA_Bunk_Data] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [Overhead_application_history] (
    [Location_code] SMALLINT NULL,
    [Period_from] DATETIME NOT NULL,
    [Period_to] DATETIME NOT NULL,
    [Doll_per_head_per_day] MONEY NOT NULL,
    [Ohead_Gross_Value] MONEY NOT NULL,
    [Ohead_Head] INT NOT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_Overhead_application_history] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PackageCosts] (
    [CountryCode] SMALLINT NOT NULL,
    [BasicPackage] REAL NULL,
    [PricePerThousandHead] REAL NULL,
    [BasicFeeding] REAL NULL,
    [VetRecords] REAL NULL,
    [VetReporting] REAL NULL,
    [CrushSideProc] REAL NULL,
    [FeedCommodsSystem] REAL NULL,
    [PriceAsAtDate] DATETIME NULL,
    [upsize_ts] TIMESTAMP NULL  -- in 15/34 clients
    ,CONSTRAINT [PK_PackageCosts] PRIMARY KEY ([CountryCode])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Paddock_Feeding] (
    [BeastID] INT NULL,
    [Paddock_Feed_Type] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [From_Date] DATETIME NULL,
    [To_Date] DATETIME NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Commodity_ID] SMALLINT NOT NULL
    ,CONSTRAINT [PK_Paddock_Feeding] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Lowlands Pastoral Co
CREATE TABLE [Paste Errors] (
    [F1] VARCHAR(255) NULL
);

-- Table found in 21 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_and_Bunk_Cleaning] (
    [Pen_name] VARCHAR(10) NOT NULL,
    [Date_Pen_Cleaned] DATETIME NULL,
    [Pen_ground_type] VARCHAR(15) NULL  -- in 2/21 clients,
    [Date_Bunk_Cleaned] DATETIME NULL,
    [Days_between_cleaning] SMALLINT NULL  -- in 2/21 clients,
    [Comments] NTEXT NULL,
    [Days_since_pen_clean] SMALLINT NULL  -- in 2/21 clients,
    [Days_since_bunk_clean] SMALLINT NULL  -- in 2/21 clients
    ,CONSTRAINT [PK_Pen_and_Bunk_Cleaning] PRIMARY KEY ([Pen_name])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_and_Bunk_Cleaning_Master] (
    [Pen_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Pen_type] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Pen_ground_type] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Days_between_cleaning] SMALLINT NULL,
    [Date_Pen_Cleaned] DATETIME NULL,
    [Days_since_pen_clean] SMALLINT NULL,
    [Date_Bunk_Cleaned] DATETIME NULL,
    [Days_since_bunk_clean] SMALLINT NULL,
    [Comments] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Date_water_cleaned] DATETIME NULL  -- in 19/27 clients,
    [Days_since_water_cleaned] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 19/27 clients
    ,CONSTRAINT [PK_Pen_and_Bunk_Cleaning_Master] PRIMARY KEY ([Pen_name])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_CallWeight_date_snapshot] (
    [Pen_Number_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Feed_date] DATETIME NULL,
    [Head] SMALLINT NULL,
    [Kgs_per_Head] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: BIGINT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pen_CallWeight_date_snapshot] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Cleaning_dates] (
    [Pen_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Date_cleaned] DATETIME NOT NULL,
    [Notes] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pen_Cleaning_dates] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Data_From_FeedDB] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_Name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Mob_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Numb_Head] SMALLINT NOT NULL,
    [Ration_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 33/34 clients
    ,CONSTRAINT [PK_Pen_Data_From_FeedDB] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_DOF] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [DOF_From] SMALLINT NULL,
    [Pen_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [DOF_To] SMALLINT NULL
    ,CONSTRAINT [PK_Pen_DOF] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Feeding_Order_Params] (
    [Ration_Type] SMALLINT NOT NULL,
    [Truck_Size] INT NULL,
    [Extra_Feed_%Allowed] SMALLINT NULL,
    [Feed_system_B_trigger] SMALLINT NULL,
    [DATA0] REAL NULL,
    [DATA1] REAL NULL,
    [DATA2] REAL NULL,
    [DATA3] REAL NULL,
    [DATA4] REAL NULL,
    [DATA5] REAL NULL,
    [DATA6] REAL NULL,
    [DATA7] REAL NULL,
    [DATA8] REAL NULL,
    [DATA9] REAL NULL,
    [DATA10] REAL NULL,
    [DATA11] REAL NULL,
    [DATA12] REAL NULL,
    [DATA13] REAL NULL,
    [DATA14] REAL NULL,
    [DATA15] REAL NULL,
    [DATA16] REAL NULL,
    [DATA17] REAL NULL,
    [DATA18] REAL NULL,
    [DATA19] REAL NULL,
    [DATA20] REAL NULL,
    [DATA21] REAL NULL,
    [DATA22] REAL NULL,
    [DATA23] REAL NULL,
    [DATA24] REAL NULL,
    [DATA25] REAL NULL,
    [DATA26] REAL NULL,
    [DATA27] REAL NULL,
    [DATA28] REAL NULL,
    [DATA29] REAL NULL,
    [DATA30] REAL NULL,
    [DATA31] REAL NULL,
    [DATA32] REAL NULL,
    [DATA33] REAL NULL,
    [DATA34] REAL NULL,
    [DATA35] REAL NULL,
    [DATA36] REAL NULL,
    [DATA37] REAL NULL,
    [DATA38] REAL NULL,
    [DATA39] REAL NULL,
    [DATA40] REAL NULL,
    [DATA41] REAL NULL,
    [DATA42] REAL NULL,
    [DATA43] REAL NULL,
    [DATA44] REAL NULL,
    [DATA45] REAL NULL,
    [DATA46] REAL NULL,
    [DATA47] REAL NULL,
    [DATA48] REAL NULL,
    [DATA49] REAL NULL,
    [DATA50] REAL NULL,
    [DATA51] REAL NULL,
    [DATA52] REAL NULL,
    [DATA53] REAL NULL,
    [DATA54] REAL NULL,
    [DATA55] REAL NULL,
    [DATA56] REAL NULL,
    [DATA57] REAL NULL,
    [DATA58] REAL NULL,
    [DATA59] REAL NULL,
    [Truck_Volume] REAL NULL,
    [TruckName] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6)
    ,CONSTRAINT [PK_Pen_Feeding_Order_Params] PRIMARY KEY ([Ration_Type])
);

-- Table found in 15 client(s): Avondale Feedlot, Barmount, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Penna & Sons, Rangers Valley, Tonkin Farming, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Feeds_Tab] (
    [Feed_Date] DATETIME NULL,
    [Truck_No] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Pen_Name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [DayCallWght] REAL NULL,
    [Call_Wght] REAL NULL,
    [Feed_Weight] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pen_Feeds_Tab] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Feeds_Temp] (
    [Pen_Name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Mob_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Numb_Head] SMALLINT NULL,
    [Ration_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Ration_Type_text] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Bunk_Code] NVARCHAR(2) NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Kgs_Head] REAL NULL,
    [5_day_ADI] REAL NULL,
    [Feed1_Kgs] REAL NULL,
    [Feed1_Order] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Feed2_Kgs] REAL NULL,
    [Feed2_Order] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Feed3_Kgs] REAL NULL,
    [Feed3_Order] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Feed4_Kgs] REAL NULL,
    [Feed4_Order] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [DOF] INT NULL,
    [PM_Ration_name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(8),
    [Forced_one_feed_only] BIT NOT NULL  -- in 27/28 clients
    ,CONSTRAINT [PK_Pen_Feeds_Temp] PRIMARY KEY ([Pen_Name])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Feeds_Temp_Cycles] (
    [Pen_Name] NVARCHAR(14) NULL  -- types seen: NVARCHAR(14), VARCHAR(14),
    [Cycle_No] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [No_Head] SMALLINT NULL,
    [Ration_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Ration_Type] SMALLINT NULL,
    [Ration_Type_text] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Kgs_To_Feed] REAL NULL,
    [Extra_Feed_Alloc] REAL NULL,
    [Feed_Order] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Ration_Code] INT NULL,
    [FeedDate] DATETIME NULL,
    [Last_Feeding_Time] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Updated_Today] BIT NOT NULL,
    [Weight_left_to_be_Fed] SMALLINT NULL
    ,CONSTRAINT [PK_Pen_Feeds_Temp_Cycles] PRIMARY KEY ([ID])
);

-- Table found in 15 client(s): BSN Trading, Barmount, Cadelga Cattle Co, Conargo Feedlot, Demonstration Database, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_mort_morb_list] (
    [Pen_Number] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [DOF] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 7/15 clients,
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [CountOfEar_Tag] SMALLINT NULL,
    [Sick] SMALLINT NULL  -- in 1/15 clients,
    [Head_Sick] SMALLINT NULL  -- in 14/15 clients,
    [Died] SMALLINT NULL  -- in 1/15 clients,
    [Head_Died] SMALLINT NULL  -- in 14/15 clients,
    [Entry_Date] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12)  -- in 7/15 clients,
    [HeadDays] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Feed_yesterday] REAL NULL  -- in 14/15 clients,
    [Feed_last_3_days] REAL NULL  -- in 14/15 clients,
    [Feed_last_7_days] REAL NULL  -- in 14/15 clients,
    [average_entry_weight] FLOAT NULL  -- in 8/15 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pen_mort_morb_list] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Print_Order] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [PrintOrder] SMALLINT NULL
    ,CONSTRAINT [PK_Pen_Print_Order] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [Pen_Print_Order_old] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_name] NVARCHAR(10) NULL,
    [PrintOrder] SMALLINT NULL
    ,CONSTRAINT [PK_Pen_Print_Order_old] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 26 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Glen Avon, Hutchinson Grazing, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Rider_Tolerances] (
    [Pulls_LE_45_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_LE_45_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_46_120_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_46_120_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_121_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_121_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_GT_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_GT_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_total_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Pulls_totals_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_LT_45_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_LT_45_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_46_120_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_46_120_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_121_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_121_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_GT_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_pcnt_GT_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_totals_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Treat_success_totals_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_LE_45_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_LE_45_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_46_120_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_46_120_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_121_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_121_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_GT_200_dof_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_GT_200_dof_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_total_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Death_alloc_total_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pen_Rider_Tolerances] PRIMARY KEY ([ID])
);

-- Table found in 13 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pen_Split_Rations] (
    [ID] INT NOT NULL,
    [Pen_ID] SMALLINT NULL,
    [Feed_date] DATETIME NULL,
    [AM_Ration] NCHAR(8) NULL,
    [AM_Ration_Code] SMALLINT NULL,
    [PM_Ration] NCHAR(8) NULL,
    [PM_Ration_Code] SMALLINT NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pending_Feed_Data] (
    [Feed_date] DATETIME NULL,
    [PenName] VARCHAR(10) NULL,
    [Head] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [RationName] VARCHAR(8) NULL,
    [Feed_Weight] REAL NULL,
    [PenFeeds_RecID] INT NULL,
    [Apply_to_Group] VARCHAR(15) NULL,
    [HeadSelected] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Applied] BIT NULL,
    [Never_Apply] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Pending_Feed_Data] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PenFeedsData] (
    [Feed_Date] DATETIME NOT NULL,
    [Truck_No] NVARCHAR(6) NOT NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Numb_for_Day] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT  -- in 22/28 clients,
    [Pen_Number_ID] SMALLINT NOT NULL  -- in 22/28 clients,
    [Mob_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8)  -- in 22/28 clients,
    [Number_Cattle] SMALLINT NOT NULL  -- in 22/28 clients,
    [Feed_Weight] REAL NOT NULL  -- in 22/28 clients,
    [Time_Fed] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 22/28 clients,
    [Load_RecID] INT NOT NULL  -- in 22/28 clients,
    [System_User_ID] SMALLINT NULL  -- in 22/28 clients,
    [Applied_to_Cattle] BIT NOT NULL  -- in 22/28 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 22/28 clients,
    [Ration_Code] SMALLINT NULL  -- in 22/28 clients,
    [Ration_Value_per_Ton] REAL NULL  -- in 22/28 clients,
    [Call_Wght] REAL NULL  -- in 22/28 clients,
    [Batch_Number] SMALLINT NULL  -- in 21/28 clients,
    [Postpone_Feed_Application] BIT NULL  -- in 20/28 clients
    ,CONSTRAINT [PK_PenFeedsData] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PenLaneOrder] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_Name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [LaneOrder] SMALLINT NULL,
    [Zone_number] SMALLINT NULL
    ,CONSTRAINT [PK_PenLaneOrder] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [PenLaneOrder_old] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_Name] NVARCHAR(10) NOT NULL,
    [LaneOrder] SMALLINT NULL,
    [Zone_number] SMALLINT NULL
    ,CONSTRAINT [PK_PenLaneOrder_old] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 19 client(s): 2DE, Anna Plains Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Hutchinson Grazing, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Rangers Valley, Reid River Export, Semini, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PenList_AsAt] (
    [BeastID] INT NOT NULL,
    [Pen] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)
    ,CONSTRAINT [PK_PenList_AsAt] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PenRiders_log] (
    [Employee_ID] SMALLINT NOT NULL,
    [Initials] VARCHAR(5) NOT NULL,
    [Date_pen_checked] DATETIME NOT NULL,
    [Pen_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10), VARCHAR(3),
    [Head_in_pen] SMALLINT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Diagnoser] BIT NOT NULL  -- in 33/34 clients,
    [Team_Leader] BIT NOT NULL  -- in 1/34 clients,
    [DOF] SMALLINT NOT NULL  -- types seen: INT, SMALLINT  -- in 33/34 clients
    ,CONSTRAINT [PK_PenRiders_log] PRIMARY KEY ([ID])
);

-- Table found in 16 client(s): Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Conargo Feedlot, Demonstration Database, Freestone Feedlot, KO Beef, Llanarth Pastoral Co, Lowlands Pastoral Co, Penna & Sons, Rangers Valley, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [PenRiders_Report] (
    [Pen_name] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Mob_name] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [Head] SMALLINT NULL,
    [DOF] SMALLINT NULL,
    [Feed_7_Days_Ago] REAL NULL,
    [Feed_6_Days_Ago] REAL NULL,
    [Feed_5_Days_Ago] REAL NULL,
    [Feed_4_Days_Ago] REAL NULL,
    [Feed_3_Days_Ago] REAL NULL,
    [Feed_2_Days_Ago] REAL NULL,
    [Feed_1_Days_Ago] REAL NULL,
    [Avg_Kgs_Head] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- in 7/16 clients
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Pens_File] (
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Pen_Name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Mob_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Numb_Head] SMALLINT NOT NULL,
    [Ration_Code] INT NULL  -- in 23/28 clients,
    [Kgs_Head] REAL NULL  -- in 23/28 clients,
    [Feeding_System] SMALLINT NULL  -- in 23/28 clients,
    [Inc_in_Plateau_Feed] BIT NOT NULL  -- in 23/28 clients,
    [Notes] NTEXT NULL  -- in 23/28 clients,
    [Excel_Cell] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 21/28 clients,
    [DateEnteredFeedlot] DATETIME NULL  -- in 21/28 clients,
    [Bunk_Volume] REAL NULL  -- in 21/28 clients,
    [IsPaddock] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 21/28 clients,
    [Expected_WG_Day] REAL NULL  -- in 21/28 clients,
    [Date_last_cleaned] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 21/28 clients,
    [Ration_Code_PM] SMALLINT NULL  -- in 21/28 clients,
    [Exclude_from_feed_generation] BIT NULL  -- in 21/28 clients,
    [Titration_Regime] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 20/28 clients,
    [Titration_Regime_Start_date] DATETIME NULL  -- in 20/28 clients
    ,CONSTRAINT [PK_Pens_File] PRIMARY KEY ([Pen_Number_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PensFed] (
    [FeedDate] DATETIME NOT NULL,
    [Pen_Number] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Ration_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [KilosFed] REAL NULL,
    [FeedValue] REAL NULL,
    [Applied_to_Cattle] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Dry_Matter] REAL NULL,
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_PensFed] PRIMARY KEY ([ID])
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [PensFedByDay1_CrossTab] (
    [Feed_Date] DATETIME NOT NULL,
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Ration_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8),
    [6] FLOAT NOT NULL,
    [7] FLOAT NOT NULL,
    [8] FLOAT NOT NULL,
    [9] FLOAT NOT NULL,
    [10] FLOAT NOT NULL,
    [11] FLOAT NOT NULL,
    [12] FLOAT NOT NULL,
    [13] FLOAT NOT NULL,
    [14] FLOAT NOT NULL,
    [15] FLOAT NOT NULL,
    [16] FLOAT NOT NULL,
    [17] FLOAT NOT NULL,
    [18] FLOAT NOT NULL
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [PensFedByDayRV1_CrossTab] (
    [Feed_Date] DATETIME NOT NULL,
    [Pen_Number_ID] SMALLINT NOT NULL,
    [Ration_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8),
    [6] FLOAT NOT NULL,
    [Ration_Code] SMALLINT NULL  -- in 1/14 clients,
    [7] FLOAT NOT NULL,
    [8] FLOAT NOT NULL,
    [9] FLOAT NOT NULL,
    [10] FLOAT NOT NULL,
    [11] FLOAT NOT NULL,
    [12] FLOAT NOT NULL,
    [13] FLOAT NOT NULL,
    [14] FLOAT NOT NULL,
    [15] FLOAT NOT NULL,
    [16] FLOAT NOT NULL,
    [17] FLOAT NOT NULL,
    [18] FLOAT NOT NULL,
    [Feed_Alloc] INT NOT NULL  -- in 1/14 clients
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PensFileIsOpen] (
    [Is_Open] VARCHAR(1) NULL  -- types seen: NCHAR(1), VARCHAR(1),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_PensFileIsOpen] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [PensHistory] (
    [BeastID] INT NOT NULL,
    [MoveDate] DATETIME NOT NULL,
    [Pen] VARCHAR(10) NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_PensHistory] PRIMARY KEY ([ID])
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Period_Crosstab_Kgs] (
    [Commodity_Code] SMALLINT NULL,
    [1] FLOAT NOT NULL,
    [2] FLOAT NOT NULL,
    [3] FLOAT NOT NULL,
    [4] FLOAT NOT NULL,
    [5] FLOAT NOT NULL
);

-- Table found in 14 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Period_Crosstab_val] (
    [Commodity_Code] SMALLINT NULL,
    [1] FLOAT NOT NULL,
    [2] FLOAT NOT NULL,
    [3] FLOAT NOT NULL,
    [4] FLOAT NOT NULL,
    [5] FLOAT NOT NULL
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Period_Stocks_Closing_Balance] (
    [Commodity_Code] SMALLINT NOT NULL,
    [Commodity_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Stock_value] REAL NOT NULL,
    [Stock_Tons_Weight] REAL NOT NULL
    ,CONSTRAINT [PK_Period_Stocks_Closing_Balance] PRIMARY KEY ([Commodity_Code])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Plateau_Feeding_Details] (
    [Feeding_Regimen_ID] SMALLINT NOT NULL,
    [Bunk_Codes_Total] SMALLINT NULL  -- in 24/28 clients,
    [Kgs_Head_Adj] REAL NULL  -- in 24/28 clients,
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 24/28 clients
    ,CONSTRAINT [PK_Plateau_Feeding_Details] PRIMARY KEY ([Rec_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Plateau_Feeding_Regimens] (
    [Ration_Type] SMALLINT NOT NULL,
    [Consump_per_head_From] REAL NULL  -- in 23/28 clients,
    [Consump_per_head_To] REAL NULL  -- in 23/28 clients,
    [Accum_BunkCode_days] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 23/28 clients,
    [Feeding_Regimen_ID] SMALLINT NOT NULL  -- in 23/28 clients
    ,CONSTRAINT [PK_Plateau_Feeding_Regimens] PRIMARY KEY ([Feeding_Regimen_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Price_adjustment_by_weight_range] (
    [Lot_Number] NVARCHAR(12) NOT NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Weight_from] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Weight_to] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Head] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Dollars_per_Kg_adjustment] REAL NULL  -- in 28/34 clients,
    [Cnts_per_Kg_adjustment] REAL NULL  -- in 7/34 clients,
    [Applied_to_Cattle_pricing] BIT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Price_adjustment_by_weight_range] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Purch_Lot_Cattle] (
    [Lot_Number] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Numb_Head] SMALLINT NULL,
    [Price_Cnts_per_Kg] REAL NULL,
    [Weight] REAL NULL,
    [TailTag] NVARCHAR(10) NULL  -- types seen: CHAR(10), NVARCHAR(10), VARCHAR(10),
    [Vndr_Decl_No] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(10), VARCHAR(15),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Agistment_PIC] NVARCHAR(8) NULL  -- types seen: CHAR(10), NVARCHAR(10), NVARCHAR(8), VARCHAR(10),
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients
    ,CONSTRAINT [PK_Purch_Lot_Cattle] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Purchase_Lots] (
    [Lot_Number] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [Purchase_date] DATETIME NULL,
    [Agent] VARCHAR(30) NULL,
    [WBridge_Docket] VARCHAR(6) NULL,
    [Number_Head] SMALLINT NULL,
    [Total_Weight] REAL NULL,
    [Cost_of_Cattle] REAL NULL,
    [DPI_Charges] REAL NULL,
    [Destination] VARCHAR(30) NULL,
    [Agistor_Code] SMALLINT NULL,
    [Cattle_Invoice_No] VARCHAR(10) NULL,
    [Invoice_Amount] REAL NULL,
    [Date_Cattle_Inv_Approved] DATETIME NULL,
    [Carrier] VARCHAR(30) NULL,
    [Freight_Invoice_No] VARCHAR(10) NULL,
    [Cattle_Freight_Cost] REAL NULL,
    [Date_Frght_Inv_Approved] DATETIME NULL,
    [Buyer_Commiss_per_Head] REAL NULL,
    [Buying_Fee] REAL NULL,
    [Other_Buying_Costs] REAL NULL,
    [Buyer] VARCHAR(30) NULL,
    [Purchase_Region] SMALLINT NULL,
    [Risk_factor] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Total_Cost_per_Hd] REAL NULL,
    [Total_Cost_per_Kg] REAL NULL,
    [Lot_Notes] NTEXT NULL,
    [Applied_To_Cattle_File] BIT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Check_Box_Values] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Custom_Feed_Lot] BIT NOT NULL,
    [Feed_Charge_per_Ton] REAL NULL,
    [Cattle_Owner_ID] SMALLINT NULL,
    [Agist_Rate_per_day] REAL NULL,
    [Vendor_ID] SMALLINT NULL,
    [GrowerGroupCode] SMALLINT NULL,
    [RGTI_Lot] BIT NULL,
    [RGTI_Done] BIT NULL,
    [Weigh_bridge_weight] REAL NULL,
    [Prime_Cost] REAL NULL,
    [Market_Category] SMALLINT NULL,
    [Adjusted_cost_of_cattle] REAL NULL,
    [RCGI_marbling_bonus_done] BIT NULL,
    [Agent_Code] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Last_Modified_timestamp] DATETIME NULL  -- in 33/34 clients,
    [NVD_scan_filename] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255)  -- in 33/34 clients,
    [Weigh_ticket_scan_filename] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255)  -- in 33/34 clients,
    [Optional_scan_filename1] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255)  -- in 33/34 clients,
    [Optional_scan_filename2] NVARCHAR(255) NULL  -- types seen: NVARCHAR(255), VARCHAR(255)  -- in 33/34 clients,
    [Customer_feedback_sent] BIT NULL  -- in 33/34 clients,
    [Marbling_bonus_lot] BIT NULL  -- in 33/34 clients,
    [Weighbridge_Charges] REAL NULL  -- in 30/34 clients,
    [Is_Financed] BIT NOT NULL  -- in 12/34 clients,
    [Finance_Rate] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)  -- in 12/34 clients
    ,CONSTRAINT [PK_Purchase_Lots] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Purchase_Regions] (
    [Region_ID] SMALLINT NOT NULL,
    [Region_name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20)
    ,CONSTRAINT [PK_Purchase_Regions] PRIMARY KEY ([Region_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Purchase_Totals] (
    [Tail_Tag] NVARCHAR(10) NOT NULL  -- types seen: CHAR(10), NVARCHAR(10), VARCHAR(10),
    [Start_Date] DATETIME NOT NULL,
    [Head] INT NULL
    ,CONSTRAINT [PK_Purchase_Totals] PRIMARY KEY ([Tail_Tag], [Start_Date])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Calc_Constants] (
    [RationCode] SMALLINT NOT NULL,
    [RationName] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [BeastSex] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [MinNEM_Power_Raised] REAL NULL,
    [MinNEm_Constant] REAL NULL,
    [Consumpt_Avg_Constant] REAL NULL,
    [Consumpt_Max_Constant] REAL NULL,
    [BumpIfSlick_Constant] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Ration_Calc_Constants] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Descriptions] (
    [Ration_Code] SMALLINT NOT NULL,
    [Ration_Name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(10),
    [Ration_Type] SMALLINT NOT NULL  -- in 21/28 clients,
    [Dry_Matter_Pcnt] REAL NULL  -- in 21/28 clients,
    [Current_Value_Kg] REAL NULL  -- in 21/28 clients,
    [Date_Ration_Created] DATETIME NULL  -- in 21/28 clients,
    [Date_Last_Modified] DATETIME NULL  -- in 21/28 clients,
    [Superceeded] BIT NOT NULL  -- in 21/28 clients,
    [Pcnt_FeedWeight_Tolerance] REAL NULL  -- in 21/28 clients,
    [Custom_Feed_Charge_Ton] REAL NULL  -- in 21/28 clients,
    [Custom_Pcnt_Markup] REAL NULL  -- in 21/28 clients,
    [NEm_KG] REAL NULL  -- in 21/28 clients,
    [Ration_Density] REAL NULL  -- in 21/28 clients,
    [ZoneName] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3)  -- in 21/28 clients,
    [Mixing_Time] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6)  -- in 21/28 clients,
    [Minimum_Ration_value_ton] REAL NULL  -- in 21/28 clients,
    [Custom_Feed_Markup_doll_per_ton] REAL NULL  -- in 21/28 clients,
    [WithHold_days] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 20/28 clients,
    [Liquids_premix_ration] BIT NULL  -- in 2/28 clients,
    [Micro_nutrient_cost_per_ton] REAL NULL  -- in 20/28 clients,
    [Ration_Colour] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 20/28 clients,
    [delivered_to_bunk_cost_per_ton] REAL NULL  -- in 18/28 clients,
    [interest_cost_per_ton] REAL NULL  -- in 18/28 clients,
    [Stationary_Mixer] BIT NULL  -- in 13/28 clients
    ,CONSTRAINT [PK_Ration_Descriptions] PRIMARY KEY ([Ration_Code])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Load_Sizes] (
    [Ration_Type_ID] SMALLINT NOT NULL,
    [Truck_Size_1_Wght] SMALLINT NULL,
    [Truck_Size_2_Wght] SMALLINT NULL,
    [Truck_Size_3_Wght] SMALLINT NULL,
    [Truck_Size_4_Wght] SMALLINT NULL,
    [Truck_Size_5_Wght] SMALLINT NULL,
    [Truck_Size_6_Wght] SMALLINT NULL,
    [Truck_Size_7_Wght] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 27/28 clients,
    [Truck_Size_8_Wght] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 27/28 clients,
    [Truck_Size_9_Wght] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 27/28 clients,
    [Truck_Size_10_Wght] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 27/28 clients
    ,CONSTRAINT [PK_Ration_Load_Sizes] PRIMARY KEY ([Ration_Type_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Recipe_Records] (
    [Ration_Code] SMALLINT NOT NULL,
    [Commodity_Code] SMALLINT NOT NULL,
    [Pcnt_of_Ration] REAL NULL  -- in 25/28 clients,
    [Tolerance_Kgs] SMALLINT NULL  -- in 25/28 clients,
    [Rec_Id] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 25/28 clients,
    [Loading_Seq] SMALLINT NULL  -- in 25/28 clients,
    [Liquid_Ration_Component] BIT NULL  -- in 24/28 clients,
    [Total_CallWeight_Today_cycle1] REAL NULL  -- in 24/28 clients,
    [Total_CallWeight_Today_cycle2] REAL NULL  -- in 24/28 clients,
    [Total_CallWeight_Today_cycle3] REAL NULL  -- in 24/28 clients,
    [Total_CallWeight_Today_cycle4] REAL NULL  -- in 24/28 clients
    ,CONSTRAINT [PK_Ration_Recipe_Records] PRIMARY KEY ([Rec_Id])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Regimes] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Pen_ID] SMALLINT NULL,
    [Feed_date] DATETIME NULL,
    [AM_Ration] NVARCHAR(10) NULL  -- types seen: NCHAR(8), NVARCHAR(10), VARCHAR(8),
    [AM_Ration_Code] SMALLINT NULL,
    [PM_Ration] NVARCHAR(10) NULL  -- types seen: NCHAR(8), NVARCHAR(10), VARCHAR(8),
    [PM_Ration_Code] SMALLINT NULL
    ,CONSTRAINT [PK_Ration_Regimes] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Ration_Types] (
    [Ration_Type_ID] SMALLINT NOT NULL,
    [Ration_Type] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Group_Name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15)  -- in 24/28 clients,
    [Notes] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50)  -- in 24/28 clients
    ,CONSTRAINT [PK_Ration_Types] PRIMARY KEY ([Ration_Type_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [RationNames] (
    [Ration_name] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [ValuePerTon] REAL NULL,
    [Notes] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Custom_feed_charge_ton] REAL NULL
    ,CONSTRAINT [PK_RationNames] PRIMARY KEY ([Ration_name])
);

-- Table found in 14 client(s): AAMIG, CH2 Pastoral, Glen Avon, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [RCTI_payment_grid] (
    [Mkt_Catgry] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Sex] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Row_sequence] TINYINT NULL,
    [Criteria] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Range_from] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [Range_to] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [Doll_per_Kg_deductn] REAL NULL,
    [Doll_per_Kg_paid] REAL NULL,
    [Doll_per_Kg_MRB_bonus] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_RCTI_payment_grid] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Reason_List] (
    [Reason_ID] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Reason_Description] NVARCHAR(25) NOT NULL  -- types seen: NVARCHAR(25), VARCHAR(25)
    ,CONSTRAINT [PK_Reason_List] PRIMARY KEY ([Reason_ID])
);

-- Table found in 15 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Resp_Disease_ReTreats] (
    [DrugCount] INT NOT NULL,
    [Drugs] NCHAR(75) NULL,
    [Head] INT NOT NULL,
    [Deaths] INT NOT NULL,
    [ID] INT NOT NULL
);

-- Table found in 1 client(s): Wanderribby Feedlot
CREATE TABLE [RFIDs] (
    [RFID] NVARCHAR(16) NULL
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Rudd_800_Traits] (
    [Db_FldName] NVARCHAR(30) NULL  -- types seen: NVARCHAR(30), VARCHAR(30),
    [StartPos] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [FldLen] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Rudd_800_Traits] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [RV_RCTI_data] (
    [Head] SMALLINT NULL,
    [Weight] REAL NULL,
    [Cost] REAL NULL,
    [cull_reason] NVARCHAR(20) NULL,
    [ID] INT NOT NULL,
    [Notes] NVARCHAR(50) NULL
    ,CONSTRAINT [PK_RV_RCTI_data] PRIMARY KEY ([ID])
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Glen Avon, Hutchinson Grazing, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [RV_Scheduled_DOF] (
    [DOF] SMALLINT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_RV_Scheduled_DOF] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [SB_Rec_No_Booked] (
    [SB_Rec_No_booked] INT NOT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_SB_Rec_No_Booked] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [ScalesTypes] (
    [ScalesType] INT NOT NULL,
    [ScaleName] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(20), VARCHAR(25),
    [Scale_or_Wand] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Dflt_Baud_rate] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [ScaleSendWghtCmd] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [BufferStringMinLngth] SMALLINT NULL,
    [WghtSteadyChar] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3),
    [WghtStringCharFrom] SMALLINT NULL,
    [WghtStringCharTo] SMALLINT NULL,
    [WandDownloadCommand] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3)
    ,CONSTRAINT [PK_ScalesTypes] PRIMARY KEY ([ScalesType])
);

-- Table found in 31 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [SCU_RecData] (
    [MthSeq] SMALLINT NULL,
    [Month] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [SCU_Value] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [HeadDays] REAL NULL
    ,CONSTRAINT [PK_SCU_RecData] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [ShortFeed_Feeding_Details] (
    [Feeding_Regimen_ID] SMALLINT NOT NULL,
    [Bunk_Codes_Total] SMALLINT NULL  -- in 25/28 clients,
    [Kgs_Head_Adj] REAL NULL  -- in 25/28 clients,
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 25/28 clients
    ,CONSTRAINT [PK_ShortFeed_Feeding_Details] PRIMARY KEY ([Rec_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [ShortFeed_Feeding_Regimens] (
    [Ration_Type] SMALLINT NOT NULL,
    [Consump_per_head_From] REAL NULL  -- in 20/28 clients,
    [Consump_per_head_To] REAL NULL  -- in 20/28 clients,
    [Accum_BunkCode_days] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 20/28 clients,
    [Feeding_Regimen_ID] SMALLINT NOT NULL  -- in 20/28 clients
    ,CONSTRAINT [PK_ShortFeed_Feeding_Regimens] PRIMARY KEY ([Feeding_Regimen_ID])
);

-- Table found in 15 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, Cadelga Cattle Co, Coggan Agriculture, Demonstration Database, Hutchinson Grazing, Rangers Valley, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sick_Beast_BRD_Symptoms] (
    [BeastID] INT NOT NULL,
    [Runny_Nose] BIT NULL,
    [Runny_eyes] BIT NULL,
    [Drool_slobber] BIT NULL,
    [Coughing] BIT NULL,
    [Increased_breathing_rate] BIT NULL,
    [Laboured_breathing] BIT NULL,
    [Reduced_gut_fill] BIT NULL,
    [SB_Rec_No] INT NOT NULL
    ,CONSTRAINT [PK_Sick_Beast_BRD_Symptoms] PRIMARY KEY ([SB_Rec_No])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sick_Beast_Records] (
    [Beast_ID] INT NOT NULL,
    [Ear_Tag_No] VARCHAR(8) NOT NULL,
    [Date_Diagnosed] DATETIME NULL,
    [Disease_ID] SMALLINT NULL,
    [Diagnosed_By] VARCHAR(10) NULL,
    [Severity_Level] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Date_Recovered_Died] DATETIME NULL,
    [Result_Code] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [WHold_Until] DATETIME NULL,
    [Sick_Beast_Notes] NTEXT NULL,
    [SB_Rec_No] INT NOT NULL,
    [Date_to_sick_Pen] VARCHAR(10) NULL,
    [Sick_Pen_Number] VARCHAR(10) NULL,
    [Date_Back_To_Pen] VARCHAR(10) NULL,
    [Back_To_Pen_Number] VARCHAR(10) NULL,
    [Hosp_Tag_Number] VARCHAR(8) NULL,
    [RatType] VARCHAR(10) NULL,
    [Pen_Where_Found_Sick] VARCHAR(10) NULL,
    [Euthanased] VARCHAR(1) NULL,
    [Date_Last_Updated] DATETIME NULL,
    [Too_Far_Gone] BIT NOT NULL,
    [Insurance_Claim] BIT NOT NULL,
    [Insurance_value] REAL NULL,
    [Insurance_paid] BIT NOT NULL,
    [DOF_when_sick] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Diagnoser_Empl_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [User_Initials] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [CustomFeedOwnerID] INT NULL  -- in 32/34 clients,
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12)  -- in 31/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 31/34 clients,
    [Cause_of_Death] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 28/34 clients,
    [Autopsied] VARCHAR(1) NULL  -- in 28/34 clients
    ,CONSTRAINT [PK_Sick_Beast_Records] PRIMARY KEY ([SB_Rec_No])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sick_Beast_Temperature] (
    [SB_Rec_No] INT NULL,
    [Temp_Date] DATETIME NULL,
    [Temperature] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BeastID] INT NULL,
    [Weight] REAL NULL
    ,CONSTRAINT [PK_Sick_Beast_Temperature] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sick_By_DOF] (
    [Disease_ID] SMALLINT NULL,
    [Pre_FL_Entry] INT NULL,
    [0-29_Days] INT NULL,
    [30-59_Days] INT NULL,
    [60-89_Days] INT NULL,
    [90-119_Days] INT NULL,
    [120-159_Days] INT NULL,
    [160-189_Days] INT NULL,
    [190-219_Days] INT NULL,
    [220-249_Days] INT NULL,
    [250-289_Days] INT NULL,
    [290-319_Days] INT NULL,
    [320-359_Days] INT NULL,
    [MoreThan360Days] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Sick_By_DOF] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sickness_Result_Codes] (
    [Sickness_Result_Code] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Sickness_Result] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)
    ,CONSTRAINT [PK_Sickness_Result_Codes] PRIMARY KEY ([Sickness_Result_Code])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sickness_Result_Codes_RV] (
    [Sickness_Result_Code] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Sickness_Result] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10)
    ,CONSTRAINT [PK_Sickness_Result_Codes_RV] PRIMARY KEY ([Sickness_Result_Code])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Sire_Lines] (
    [Sire_Line_ID] SMALLINT NOT NULL,
    [Sire_Line] VARCHAR(50) NULL
    ,CONSTRAINT [PK_Sire_Lines] PRIMARY KEY ([Sire_Line_ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [SOH_by_Month] (
    [MnthYYYYmmm] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Head] INT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_SOH_by_Month] PRIMARY KEY ([ID])
);

-- Table found in 26 client(s): 2DE, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Penna & Sons, Rangers Valley, Semini, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [StockRecData] (
    [LineHead] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Head] REAL NULL,
    [Value] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [AnimalCost] MONEY NULL  -- types seen: MONEY, REAL  -- in 23/26 clients,
    [Freight] MONEY NULL  -- types seen: MONEY, REAL  -- in 23/26 clients,
    [Agist_and_Feed] MONEY NULL  -- types seen: MONEY, REAL  -- in 23/26 clients,
    [OtherCosts] MONEY NULL  -- types seen: MONEY, REAL  -- in 23/26 clients
    ,CONSTRAINT [PK_StockRecData] PRIMARY KEY ([ID])
);

-- Table found in 23 client(s): Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Conargo Feedlot, Demonstration Database, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Penna & Sons, Rangers Valley, Semini, Thomas Foods, Victoria Hill Lamb, Wanderribby Feedlot, Yarralinka Livestock Co
CREATE TABLE [StockRecFilter] (
    [BeastID] INT NOT NULL
    ,CONSTRAINT [PK_StockRecFilter] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [SubGroupNames] (
    [Sub_Group] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_SubGroupNames] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Tag_Bucket_File] (
    [RFID_Number] VARCHAR(30) NOT NULL,
    [NLIS_Number] VARCHAR(20) NULL
    ,CONSTRAINT [PK_Tag_Bucket_File] PRIMARY KEY ([RFID_Number])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [TandR_Buying_details] (
    [BeastID] INT NOT NULL,
    [Agent_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Buyer_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Supplier_ID] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Sale_yard_Pen] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Animal_Grade] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3),
    [SaleYard_or_Paddock] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Payment_Status] NVARCHAR(9) NULL  -- types seen: NVARCHAR(9), VARCHAR(9),
    [Date_Purchased] DATETIME NULL,
    [Date_paid] DATETIME NULL
    ,CONSTRAINT [PK_TandR_Buying_details] PRIMARY KEY ([BeastID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [TandR_Costs_Report] (
    [BeastID] INT NULL,
    [EID] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [Group] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Col1] REAL NULL,
    [Col2] REAL NULL,
    [Col3] REAL NULL,
    [Col4] REAL NULL,
    [Col5] REAL NULL,
    [Col6] REAL NULL,
    [Col7] REAL NULL,
    [Col8] REAL NULL,
    [Col9] REAL NULL,
    [Col10] REAL NULL,
    [Dress_Weight] REAL NULL,
    [Doll_per_Kg_dressed] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Ear_Tag] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Purch_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [FL_entry_date] DATETIME NULL  -- in 33/34 clients,
    [FL_entry_wght] REAL NULL  -- in 33/34 clients,
    [DOF] SMALLINT NULL  -- types seen: INT, SMALLINT  -- in 33/34 clients
    ,CONSTRAINT [PK_TandR_Costs_Report] PRIMARY KEY ([ID])
);

-- Table found in 33 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Tax_Invoice_Bank_details] (
    [Company_name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Address] NVARCHAR(100) NULL  -- types seen: NVARCHAR(100), VARCHAR(100),
    [Telephone] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [Fax_number] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [ABN] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Bank_AC_name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Bank_name] NVARCHAR(50) NULL  -- types seen: NVARCHAR(50), VARCHAR(50),
    [Bank_BSB] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Bank_AC_number] NVARCHAR(16) NULL  -- types seen: NVARCHAR(16), VARCHAR(16),
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [GST_rate] REAL NULL,
    [Default_Days_Invoice_Due] SMALLINT NULL  -- in 30/33 clients,
    [Account_Code] NVARCHAR(4) NULL  -- in 1/33 clients
    ,CONSTRAINT [PK_Tax_Invoice_Bank_details] PRIMARY KEY ([ID])
);

-- Table found in 2 client(s): Freestone Feedlot, KO Beef
CREATE TABLE [Temp_Pen_table] (
    [PenName] VARCHAR(10) NOT NULL,
    [IsPaddock] VARCHAR(1) NOT NULL
);

-- Table found in 2 client(s): Freestone Feedlot, KO Beef
CREATE TABLE [Temp_Ration_table] (
    [RationName] VARCHAR(10) NOT NULL,
    [DM_Pcnt] REAL NOT NULL
);

-- Table found in 27 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Titration_Ration_Regimes] (
    [Titration_Regime_name] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Date_defined] DATETIME NULL,
    [Start_day_Number] SMALLINT NOT NULL,
    [End_day_Number] SMALLINT NOT NULL,
    [Ration_Name_Feed1] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed1] SMALLINT NULL,
    [Ration_Pcnt_Feed1] REAL NULL,
    [Ration_Name_Feed2] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed2] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Ration_Pcnt_Feed2] REAL NULL,
    [Ration_Name_Feed3] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed3] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Ration_Pcnt_Feed3] REAL NULL,
    [Ration_Name_Feed4] NVARCHAR(8) NULL  -- types seen: NVARCHAR(10), NVARCHAR(8), VARCHAR(8),
    [Ration_Code_Feed4] SMALLINT NULL  -- types seen: INT, SMALLINT,
    [Ration_Pcnt_Feed4] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: BIGINT, INT (IDENTITY),
    [ADG_expected] REAL NULL
    ,CONSTRAINT [PK_Titration_Ration_Regimes] PRIMARY KEY ([ID])
);

-- Table found in 20 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [TR_Payment_Breed_Adjust] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BreedName] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Price_per_Kg_adjust] REAL NULL
    ,CONSTRAINT [PK_TR_Payment_Breed_Adjust] PRIMARY KEY ([ID])
);

-- Table found in 20 client(s): AAMIG, CH2 Pastoral, Conargo Feedlot, Freestone Feedlot, Glen Avon, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Tonkin Farming, Willow Bend Feedlot
CREATE TABLE [TR_Payment_rates] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Valid_From_date] DATETIME NULL,
    [Wght_FROM] SMALLINT NULL,
    [Wght_TO] SMALLINT NULL,
    [0_to_2_Teeth] REAL NULL,
    [3_to_4_Teeth] REAL NULL,
    [5_to_8_Teeth] REAL NULL,
    [Vendor_Bred_Adjust] REAL NULL
    ,CONSTRAINT [PK_TR_Payment_rates] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transaction_Types] (
    [Trans_Type_ID] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Trans_Type_Short] NVARCHAR(1) NOT NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Trans_Type_Long] NVARCHAR(15) NOT NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Trans_Effect] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)  -- in 22/28 clients
    ,CONSTRAINT [PK_Transaction_Types] PRIMARY KEY ([Trans_Type_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transmitted_Pens_Fed_Datalink] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Truck_No] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Pen_Number] NVARCHAR(10) NULL  -- types seen: NVARCHAR(10), VARCHAR(10),
    [Batch_Number] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4),
    [Load_Date] DATETIME NULL,
    [Load_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Feed_Weight] REAL NULL,
    [Ration_name] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Processed] BIT NULL,
    [Call_Wght] REAL NULL
    ,CONSTRAINT [PK_Transmitted_Pens_Fed_Datalink] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transmitted_PensFed] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Truck_Name] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Date] DATETIME NULL,
    [Load_Number_For_Day] SMALLINT NULL,
    [PenID_Fed_And_Wght] NTEXT NULL  -- types seen: NTEXT, NVARCHAR(208), NVARCHAR(320)  -- in 23/28 clients
    ,CONSTRAINT [PK_Transmitted_PensFed] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transmitted_Truck_Loads] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Truck_Name] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Date] DATETIME NULL,
    [Load_Number_For_Day] SMALLINT NULL,
    [Load_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Driver_ID] SMALLINT NULL,
    [Loader_ID] SMALLINT NULL,
    [Target_Wght] REAL NULL,
    [Ration_Code] SMALLINT NULL,
    [Commod_Weights_Loaded] NVARCHAR(120) NULL  -- types seen: NVARCHAR(120), VARCHAR(120)  -- in 20/28 clients,
    [PenID_Fed_And_Wght] NTEXT NULL  -- types seen: NTEXT, NVARCHAR(208), NVARCHAR(320)  -- in 20/28 clients,
    [Batch_Number] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), SMALLINT, VARCHAR(4)  -- in 20/28 clients
    ,CONSTRAINT [PK_Transmitted_Truck_Loads] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transmitted_Truck_Loads_Datalink] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [BatchBox] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Date] DATETIME NULL,
    [Load_Number_For_Day] SMALLINT NULL,
    [Load_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Driver_ID] SMALLINT NULL,
    [Loader_ID] SMALLINT NULL,
    [Target_Wght] REAL NULL,
    [Ration_Code] SMALLINT NULL,
    [Commod_Weights_Loaded] NVARCHAR(120) NULL  -- types seen: NVARCHAR(120), VARCHAR(120)  -- in 22/28 clients,
    [Batch_Number] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), SMALLINT, VARCHAR(4)  -- in 22/28 clients
    ,CONSTRAINT [PK_Transmitted_Truck_Loads_Datalink] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Transmitted_Truckdata_Report] (
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Truck_Name] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Date] DATETIME NULL,
    [Load_Number_For_Day] SMALLINT NULL,
    [Load_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Driver] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Loader] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Target_Wght] REAL NULL,
    [Ration] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Commod1] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght1] INT NULL,
    [Commod2] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght2] INT NULL,
    [Commod3] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght3] INT NULL,
    [Commod4] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght4] INT NULL,
    [Commod5] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght5] INT NULL,
    [Commod6] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght6] INT NULL,
    [Commod7] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght7] INT NULL,
    [Commod8] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght8] INT NULL,
    [Commod9] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght9] INT NULL,
    [Commod10] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght10] INT NULL,
    [Commod11] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght11] INT NULL,
    [Commod12] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght12] INT NULL,
    [Pen1] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght1] INT NULL,
    [Pen2] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght2] INT NULL,
    [Pen3] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght3] INT NULL,
    [Pen4] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght4] INT NULL,
    [Pen5] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght5] INT NULL,
    [Pen6] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght6] INT NULL,
    [Pen7] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght7] INT NULL,
    [Pen8] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght8] INT NULL,
    [Pen9] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght9] INT NULL,
    [Pen10] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght10] INT NULL,
    [Pen11] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght11] INT NULL,
    [Pen12] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght12] INT NULL,
    [Pen13] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght13] INT NULL,
    [Pen14] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght14] INT NULL,
    [Pen15] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght15] INT NULL,
    [Pen16] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght16] INT NULL,
    [Pen17] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght17] INT NULL,
    [Pen18] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght18] INT NULL,
    [Pen19] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght19] INT NULL,
    [Pen20] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght20] INT NULL,
    [Pen21] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght21] INT NULL,
    [Pen22] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght22] INT NULL,
    [Pen23] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght23] INT NULL,
    [Pen24] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght24] INT NULL,
    [Pen25] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght25] INT NULL,
    [Pen26] NVARCHAR(8) NULL  -- types seen: NVARCHAR(8), VARCHAR(8),
    [Pen_Wght26] INT NULL,
    [Commod13] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght13] INT NULL,
    [Commod14] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght14] INT NULL,
    [Commod15] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Com_Wght15] INT NULL,
    [Batch_Number] NVARCHAR(4) NULL  -- types seen: NVARCHAR(4), VARCHAR(4)  -- in 25/28 clients
    ,CONSTRAINT [PK_Transmitted_Truckdata_Report] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Treatment_Regimes] (
    [DiseaseID] SMALLINT NULL,
    [Day_Numb] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [Drug_Name] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [Dose] REAL NULL,
    [DoseByWeight] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1),
    [Drug_ID] SMALLINT NULL,
    [UserID] SMALLINT NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_Treatment_Regimes] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Trial_Description] (
    [Trial_No] SMALLINT NOT NULL,
    [Name] VARCHAR(20) NULL,
    [Purpose] NTEXT NULL,
    [Description] NTEXT NULL,
    [Start_Date] DATETIME NULL,
    [End_Date] DATETIME NULL,
    [Total_Head] SMALLINT NULL,
    [Results] NTEXT NULL
    ,CONSTRAINT [PK_Trial_Description] PRIMARY KEY ([Trial_No])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Truck_Load_variation_data] (
    [Truck_Load_RecID] INT NULL,
    [Commodity_name] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(15),
    [Actual_Weight] REAL NULL,
    [Target_Weight] REAL NULL  -- in 25/28 clients,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 25/28 clients
    ,CONSTRAINT [PK_Truck_Load_variation_data] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Truck_Loads] (
    [Load_Date] DATETIME NOT NULL,
    [Truck_No] NVARCHAR(6) NOT NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_Numb_for_Day] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Driver_ID] SMALLINT NULL,
    [Loader_ID] SMALLINT NULL,
    [Load_Time] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5),
    [Ration_Code] SMALLINT NOT NULL,
    [Target_Load_Weight] REAL NULL,
    [Applied_to_Cattle] BIT NOT NULL,
    [Load_RecID] INT NOT NULL,
    [Batch_Number] SMALLINT NULL,
    [Ration_DM_Pcnt] REAL NULL,
    [StaffID] SMALLINT NULL,
    [BatchBox] NVARCHAR(3) NULL  -- types seen: NVARCHAR(3), VARCHAR(3)
    ,CONSTRAINT [PK_Truck_Loads] PRIMARY KEY ([Load_Date], [Truck_No], [Load_Numb_for_Day])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Truck_names] (
    [Truck_Number] SMALLINT NOT NULL,
    [Truck_Name] NVARCHAR(6) NOT NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Max_Kgs_Load_Value] INT NULL,
    [Last_LoadOut_Rec] INT NULL  -- in 23/28 clients,
    [Last_FeedOut_Rec] INT NULL  -- in 23/28 clients
    ,CONSTRAINT [PK_Truck_names] PRIMARY KEY ([Truck_Number])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [TruckLoadChangesLog] (
    [Truck_Name] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [Load_date] DATETIME NOT NULL,
    [Load_Number_For_Day] SMALLINT NULL,
    [Comod_or_Pen] NVARCHAR(2) NOT NULL  -- types seen: NVARCHAR(2), VARCHAR(2),
    [Old_Name] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [Old_Weight] REAL NULL,
    [New_Name] NVARCHAR(25) NULL  -- types seen: NVARCHAR(25), VARCHAR(25),
    [New_Weight] REAL NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_TruckLoadChangesLog] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [User_Log_Ons] (
    [User_Number] SMALLINT NOT NULL,
    [Log_on_Date_time] DATETIME NOT NULL,
    [Term_inal] VARCHAR(50) NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)
    ,CONSTRAINT [PK_User_Log_Ons] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Vendor_Declarations] (
    [Vendor_Dec_Number] NVARCHAR(15) NULL  -- types seen: NVARCHAR(15), VARCHAR(10), VARCHAR(15),
    [Owner_Contact_ID] SMALLINT NULL,
    [Form_Date] DATETIME NULL,
    [Number_Cattle] SMALLINT NULL,
    [Cattle_Description] VARCHAR(50) NULL,
    [Tail_Tag] VARCHAR(10) NULL,
    [RFIDs_in_cattle] VARCHAR(1) NULL,
    [HGP_Treated] VARCHAR(1) NULL,
    [QA_program] VARCHAR(1) NULL,
    [QA_Program_details] VARCHAR(50) NULL,
    [Born_on_Vend_prop] VARCHAR(1) NULL,
    [Owned_LT_2months] VARCHAR(1) NULL,
    [Owned_2_6_months] VARCHAR(1) NULL,
    [Owned_6_12_months] VARCHAR(1) NULL,
    [Owned_GT_12_months] VARCHAR(1) NULL,
    [Fed_stockfeeds] VARCHAR(1) NULL,
    [Chem_Res_restriction] VARCHAR(1) NULL,
    [Withholding_for_drugs] VARCHAR(1) NULL,
    [Withholding_for_feed] VARCHAR(1) NULL,
    [Endosulfan_exposure] VARCHAR(1) NULL,
    [Endosulfan_Date] VARCHAR(10) NULL,
    [Additional_info] VARCHAR(50) NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Fed_Animal_Fats] NVARCHAR(1) NULL  -- types seen: NVARCHAR(1), VARCHAR(1)
    ,CONSTRAINT [PK_Vendor_Declarations] PRIMARY KEY ([ID])
);

-- Table found in 1 client(s): Rangers Valley
CREATE TABLE [Vet_Summary_report] (
    [Period] NVARCHAR(50) NULL,
    [TotalPulls] INT NULL,
    [Died_LT_200_DOF] INT NULL,
    [Died_GT_200_DOF] INT NULL,
    [Gastro] INT NULL,
    [MuscleSkeletal] INT NULL,
    [Nervous] INT NULL,
    [Respiratory] INT NULL,
    [Urinogenital] INT NULL,
    [Other] INT NULL,
    [ID] INT NOT NULL
    ,CONSTRAINT [PK_Vet_Summary_report] PRIMARY KEY ([ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [WAGYU_Feeding_Details] (
    [Feeding_Regimen_ID] SMALLINT NOT NULL,
    [Bunk_Codes_Total] SMALLINT NULL  -- in 23/28 clients,
    [Kgs_Head_Adj] REAL NULL  -- in 23/28 clients,
    [Rec_ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY)  -- in 23/28 clients
    ,CONSTRAINT [PK_WAGYU_Feeding_Details] PRIMARY KEY ([Rec_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [WAGYU_Feeding_Regimens] (
    [Ration_Type] SMALLINT NOT NULL,
    [Consump_per_head_From] REAL NULL  -- in 22/28 clients,
    [Consump_per_head_To] REAL NULL  -- in 22/28 clients,
    [Accum_BunkCode_days] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 22/28 clients,
    [Feeding_Regimen_ID] SMALLINT NOT NULL  -- in 22/28 clients
    ,CONSTRAINT [PK_WAGYU_Feeding_Regimens] PRIMARY KEY ([Feeding_Regimen_ID])
);

-- Table found in 28 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Moruya Feedlot, Penna & Sons, Rangers Valley, Reid River Export, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [WbridgeCOMport] (
    [COMport] NVARCHAR(6) NULL  -- types seen: NVARCHAR(6), VARCHAR(6),
    [BaudRate] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12),
    [ScaleType] NVARCHAR(20) NULL  -- types seen: NVARCHAR(20), VARCHAR(20),
    [ID] SMALLINT NOT NULL
    ,CONSTRAINT [PK_WbridgeCOMport] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Weighing_Events] (
    [BeastID] INT NOT NULL,
    [Ear_Tag] VARCHAR(8) NOT NULL,
    [Weighing_Type] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Weigh_date] DATETIME NULL,
    [Weight] REAL NULL,
    [Days_Owned] SMALLINT NULL,
    [Intermed_WG_per_Day] REAL NULL,
    [Weigh_Note] VARCHAR(20) NULL,
    [ID] INT (IDENTITY) NOT NULL  -- types seen: INT, INT (IDENTITY),
    [Last_Record_For_Beast] VARCHAR(1) NULL,
    [P8_Fat] SMALLINT NULL  -- types seen: SMALLINT, TINYINT,
    [TimeWeighed] VARCHAR(8) NULL,
    [Agistor_ID] SMALLINT NULL  -- in 32/34 clients,
    [BE_Agist_Lot_No] NVARCHAR(12) NULL  -- types seen: NVARCHAR(12), VARCHAR(12)  -- in 32/34 clients,
    [Cull_Reason_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [Beast_Sale_Type_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [To_Locn_Type_ID] SMALLINT NULL  -- types seen: SMALLINT, TINYINT  -- in 32/34 clients,
    [User_Initials] NVARCHAR(5) NULL  -- types seen: NVARCHAR(5), VARCHAR(5)  -- in 32/34 clients,
    [Last_Modified_timestamp] DATETIME NULL  -- in 31/34 clients
    ,CONSTRAINT [PK_Weighing_Events] PRIMARY KEY ([ID])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Weighing_Types] (
    [Weighing_Type] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Weighing_Desc] NVARCHAR(10) NOT NULL  -- types seen: NVARCHAR(10), VARCHAR(10)
    ,CONSTRAINT [PK_Weighing_Types] PRIMARY KEY ([Weighing_Type])
);

-- Table found in 34 client(s): 2DE, AAMIG, Anna Plains Feedlot, Avondale Feedlot, BSN Trading, Barmount, Bos Grazing, CH2 Pastoral, Cadelga Cattle Co, Coggan Agriculture, Conargo Feedlot, Demonstration Database, Freestone Feedlot, Glen Avon, Hutchinson Grazing, KO Beef, Kerrigan Valley Feedlot, Llanarth Pastoral Co, Lowlands Pastoral Co, Midfield Group, Mirambee Livestock, Moruya Feedlot, Myrtlevale Partnership, P&C and D&G Tuohey, Penna & Sons, Rangers Valley, Reid River Export, Semini, Thomas Foods, Tonkin Farming, Victoria Hill Lamb, Wanderribby Feedlot, Willow Bend Feedlot, Yarralinka Livestock Co
CREATE TABLE [Weighing_Types_RV] (
    [Weighing_Type_ID] SMALLINT NOT NULL  -- types seen: SMALLINT, TINYINT,
    [Weighing_Type] NVARCHAR(20) NOT NULL  -- types seen: NVARCHAR(20), VARCHAR(20)
    ,CONSTRAINT [PK_Weighing_Types_RV] PRIMARY KEY ([Weighing_Type_ID])
);
