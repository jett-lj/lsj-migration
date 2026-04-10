/**
 * Transform mappings.js to target schema-farm-v3.sql table/column names.
 * 
 * This script reads mappings.js, applies all known table and column renames,
 * then writes the result. It also validates the output against schema-farm-v3.sql.
 * 
 * Usage: node _transform_mappings.js [--dry-run]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');

// ── Table renames (optimized → farm-v3) ─────────────────
const TABLE_RENAMES = {
  'cattle.cattle':                          'cattle.cows',
  'cattle.cattleprocessed':                 'cattle.cattle_processed',
  'cattle.beastmovement':                   'cattle.beast_movements',
  'cattle.beast_cull_reasons':              'cattle.cull_reasons',
  'cattle.market_category':                 'cattle.market_categories',
  'cattle.purch_lot_cattle':                'cattle.purchase_lot_cattle',
  'cattle.tag_bucket_file':                 'cattle.tag_bucket',
  'cattle.beast_ohead_appl_history':        'cattle.overhead_application_history',
  'cattle.beast_ohead_appl_history_pens':   'cattle.overhead_application_pens',
  'cattle.nlis_transfers':                  'operations.nlis_transfers',
  'cattle.rfid_scan_sessions':              'operations.rfid_scan_sessions',
  'feed.rationnames':                       'feed.rations',
  'feed.bunk_call_sessions':                'operations.bunk_call_sessions',
  'feed.bunk_call_entries':                 'operations.bunk_call_entries',
  'health.drug_disposal':                   'health.drug_disposals',
  'health.sick_beast_temperature':          'health.sick_beast_temperatures',
  'health.drugs_purchase_event':            'health.drug_purchase_events',
  'finance.overhead_application_history':   'cattle.overhead_application_history',
  'finance.scu_rec_data':                   'reporting.scu_rec_data',
  'finance.stock_rec_data':                 'reporting.stock_rec_data',
  'pen.batch_pen_operations':               'operations.batch_pen_operations',
  'pen.pen_list_snapshots':                 'cattle.pen_list_snapshots',
  'weighing.weighbridge_dockets':           'operations.weighbridge_dockets',
  'transport.transport_dispatches':         'operations.transport_dispatches',
  'transport.transport_dispatch_items':     'operations.transport_dispatch_items',
  'system.archiving_log':                   'operations.archiving_log',
  'system.drafting_settings':               'operations.drafting_settings',
  'system.agent_issues':                    'operations.agent_issues',
  'system.archives':                        'operations.archives',
};

// ── Universal column renames (apply across ALL tables) ──
const UNIVERSAL_COL_RENAMES = {
  'beastid':                    'cow_id',
  'last_modified_timestamp':    'legacy_modified_at',
};

// ── Per-table column renames ────────────────────────────
// Key: NEW target table name (after table rename). Value: { old → new }
const TABLE_COL_RENAMES = {

  // cattle.cows (was cattle.cattle)
  'cattle.cows': {
    'ear_tag':                     'tag_number',
    'start_weight':                'start_weight_kg',
    'sale_weight':                 'sale_weight_kg',
    'feedlot_entry_wght':          'feedlot_entry_weight_kg',
    'background_doll_per_kg':      'background_cost_per_kg',
    'pen_number':                  'pen_id',
    'purch_lot_no':                'purchase_lot_id',
    'whold_until':                 'withhold_until',
    'esi_whold_until':             'esi_withhold_until',
    'pregtested':                  'preg_tested',
    'customfeedownerid':           'custom_feed_owner_id',
    'nlis_tag_fail_at_induction':  'nlis_tag_fail',
    'dna_or_blood_number':         'dna_blood_number',
    'nfas_decl_numb':              'nfas_decl_number',
    'growergroupcode':             'grower_group_code',
    'current_loctype_id':          'current_loc_type_id',
    'vendorid':                    'vendor_id',
    'agentid':                     'agent_id',
    'agist_charged_up_to_date':    'agist_charged_to_date',
    'last_ohead_update_date':      'last_overhead_update_date',
    'died':                        'status',   // transform also changes below
    'weight_gain':                 'weight_gain_kg',
    'paddock_wg':                  'paddock_weight_gain_kg',
    'feedlot_wg':                  'feedlot_weight_gain_kg',
    'carcase_weight':              'carcase_weight_kg',
    'in_feedlot':                  'in_feedlot',   // same name, exists in farm-v3
  },

  // cattle_photos
  'cattle.cattle_photos': {
    'beastid':       'cow_id',
    'datelastupdated': 'date_last_updated',
  },

  // new_cattle_records_log
  'cattle.new_cattle_records_log': {
    'beastid':          'cow_id',
    'mod_ule':          'module',
    'proceedure_name':  'procedure_name',
  },

  // cattle_processed (was cattleprocessed)
  'cattle.cattle_processed': {
    'beastid':    'cow_id',
    'weighdate':  'weigh_date',
    'draftgate':  'draft_gate',
    'saveddate':  'saved_date',
  },

  // beast_movements (was beastmovement)
  'cattle.beast_movements': {
    'beastid':   'cow_id',
    'movedate':  'move_date',
  },

  // cattle_dof_dip
  'cattle.cattle_dof_dip': {
    'beastid':          'cow_id',
    'date_calculated':  'calc_date',
  },

  // daily_cattle_inventory
  'cattle.daily_cattle_inventory': {
    'accum_month_head_days': 'accum_month_headdays',
  },

  // batch_update_log
  'cattle.batch_update_log': {
    'logtext': 'log_text',
  },

  // gps_locations
  'cattle.gps_locations': {
    'beastid': 'cow_id',
  },

  // agistment_transfer_register
  'cattle.agistment_transfer_register': {
    'w_bridge_docket':           'wbridge_docket',
    'weight_gain_dollarper_kg':  'weightgain_doll_per_kg',
    'agistor_tail_tag':          'agistor_tailtag',
  },

  // pen_list_snapshots (was pen.pen_list_snapshots)
  'cattle.pen_list_snapshots': {
    'pen': 'pen_name',
  },

  // cull_reasons (was beast_cull_reasons)
  'cattle.cull_reasons': {
    'cull_reason_id': 'cull_reason_id',
    'cull_reason':    'cull_reason',
  },

  // market_categories (was market_category)
  'cattle.market_categories': {
    'market_cat_id': 'market_cat_id',
  },

  // purchase_lot_cattle (was purch_lot_cattle)
  'cattle.purchase_lot_cattle': {
    'purch_lot_no':   'lot_number',   // Hmm, check this
  },

  // tag_bucket (was tag_bucket_file)
  'cattle.tag_bucket': {
    'rfid_number': 'rfid_number',
    'nlis_number': 'nlis_number',
  },

  // carcase_data
  'carcase.carcase_data': {
    'carc_wght_left':                  'carc_weight_left',
    'carc_wght_right':                 'carc_weight_right',
    'price_doll_kg_left':              'price_per_kg_left',
    'price_doll_kg_right':             'price_per_kg_right',
    'mscle_score':                     'muscle_score',
    'eye_mscle_area':                  'eye_muscle_area',
    'mscle_colour':                    'muscle_colour',
    'doll_kg_deduction':               'deduction_per_kg',
    'rcinvoice_date':                  'rc_invoice_date',
    'last_modified_timestamp':         'legacy_modified_at',
    'meqmsa':                          'meq_msa',
    'meqausmrb':                       'meq_aus_mrb',
    'abattoir_establishment_number':   'abattoir_est_no',
  },

  // carcase_datatype2
  'carcase.carcase_datatype2': {
    'date_record_added':  'date_record_added',   // same
  },

  // carcase_grades
  'carcase.carcase_grades': {
    'price_doll_per_kg':    'price_per_kg',
    'effective_from_date':  'effective_from_date',  // doesn't exist in farm-v3, will need to add or map
  },

  // carcase_grades_us
  'carcase.carcase_grades_us': {
    'qual_grade':  'grade_code',
    'from_date':   'from_date',     // need to check
  },

  // carcase_prices
  'carcase.carcase_prices': {
    'sold_to_id':       'buyer_id',
    'kill_date_from':   'effective_date',
    'kill_date_to':     'kill_date_to',        // may need adding
    'live_or_carc_wght': 'live_or_carc_wght',  // may need adding
  },

  // marbling_bonus
  'carcase.marbling_bonus': {
    'pay_rate_bonus_per_carcase_kg': 'bonus_per_kg',
  },

  // weighing_events
  'weighing.weighing_events': {
    'beastid':                    'cow_id',
    'weighing_type':              'weigh_type',
    'weight':                     'weight_kg',
    'p8_fat':                     'rib_fat',
    'weigh_note':                 'notes',
    'timeweighed':                'time_weighed',
    'last_modified_timestamp':    'legacy_modified_at',
    'intermed_wg_per_day':        'intermed_wg_per_day',   // may need adding
    'last_record_for_beast':      'last_record_for_beast',  // may need adding
  },

  // weighing_types
  'weighing.weighing_types': {
    'weighing_type_id':  'id',
    'weighing_type':     'name',
    'weighing_desc':     'description',
  },

  // scalestypes
  'weighing.scalestypes': {
    'scalestype':  'scale_type',
  },

  // livestock_weighbridge_dockets → operations.weighbridge_dockets
  'operations.weighbridge_dockets': {
    'docketid':               'id',
    'docket_time':            'docket_time',    // may need adding
    'exit_date':              'exit_date',       // may need adding
    'exit_time':              'exit_time',       // may need adding
    'weighpersonid':          'weighpersonid',   // may need adding
    'carrierid':              'carrierid',        // may need adding
    'origin_destinationid':   'destination',
    'weighunits':             'weighunits',       // may need adding
    'shrink_percent':         'shrink_percent',   // may need adding
  },

  // penshistory
  'pen.penshistory': {
    'beastid':                    'cow_id',
    'pen':                        'pen_name',
    'last_modified_timestamp':    'legacy_modified_at',
    'movedate':                   'movedate',  // same
  },

  // pensfed
  'pen.pensfed': {
    'feed_date':                  'feeddate',
    'last_modified_timestamp':    'legacy_modified_at',
  },

  // penlaneorder
  'pen.penlaneorder': {
    'pen_name':    'pen_name',    // not in farm-v3 → different structure
    'laneorder':   'lane_order',
    'zone_number': 'zone_number',  // not in farm-v3
  },

  // pens_file
  'pen.pens_file': {
    'numb_head':                    'current_head',
    'ration_code':                  'current_ration_code',
    'ispaddock':                    'ispaddock',   // not in farm-v3
    'include_in_plateau_feed':      'include_in_plateau_feed',  // not in farm-v3
    'dateenteredfeedlot':           'dateenteredfeedlot',  // not in farm-v3
  },

  // pen_cleaning_dates
  'pen.pen_cleaning_dates': {
    'pen_name':       'pen_id',
    'date_cleaned':   'clean_date',
  },

  // pen_print_order
  'pen.pen_print_order': {
    'pen_name':    'pen_name',     // not in farm-v3
    'printorder':  'print_order',
  },

  // log_pens_file
  'pen.log_pens_file': {
    'logid':       'id',
    'changetype':  'action',
    'changedate':  'event_timestamp',
  },

  // drugs
  'health.drugs': {
    'drug_id':                       'id',
    'drug_name':                     'name',
    'units':                         'unit',
    'withhold_days_1':               'withhold_days',
    'withhold_days_esi':             'esi_days',
    'hgp':                           'is_hgp',
    'antibiotic':                    'is_antibiotic',
    'inactive':                      'active',    // NOTE: inverted boolean!
    'current_batch_numb':            'current_batch',
    'reorder_soh_units_trigger':     'reorder_trigger_units',
    'units_per_boxorbottle':         'units_per_package',
    'last_modified_timestamp':       'legacy_modified_at',
  },

  // drug_inventory_events
  'health.drug_inventory_events': {
    'eventtype':  'event_type',
  },

  // drug_inventory_line_items
  'health.drug_inventory_line_items': {
    'recordtype':           'record_type',
    'drugid':               'drug_id',
    'units_per_boxorbottle': 'units_per_box_or_bottle',
    'boxbottles_onhand':    'box_bottles_onhand',
  },

  // drugs_given
  'health.drugs_given': {
    'beastid':                    'cow_id',
    'last_modified_timestamp':    'legacy_modified_at',
  },

  // drugs_purchased
  'health.drugs_purchased': {
    'drugid': 'drug_id',
  },

  // drug_disposals (was drug_disposal)
  'health.drug_disposals': {
    'drugid': 'drug_id',
  },

  // drug_purchase_events (was drugs_purchase_event)
  'health.drug_purchase_events': {},

  // sick_beast_records
  'health.sick_beast_records': {
    'last_modified_timestamp': 'legacy_modified_at',
  },

  // sick_beast_temperatures (was sick_beast_temperature)
  'health.sick_beast_temperatures': {
    'beastid': 'cow_id',
  },

  // diseases
  'health.diseases': {
    'disease_id':           'id',
    'disease_name':         'name',
    'bodysystemid':         'body_system',
    'penapp_disease_name':  'penapp_name',
    'no_longer_used':       'active',    // inverted
  },

  // autopsy_records
  'health.autopsy_records': {
    'tarchea_fluid': 'trachea_fluid',
  },

  // chemical_inventory
  'health.chemical_inventory': {
    'expirydate': 'expiry_date',
  },

  // mort_morb_triggers
  'health.mort_morb_triggers': {
    'tablename': 'table_name',
  },

  // treatment_regimes
  'health.treatment_regimes': {
    'diseaseid':     'disease_id',
    'day_numb':      'days',
    'drug_name':     'name',
    'dosebyweight':  'dose_by_weight',
  },

  // sickness_result_codes
  'health.sickness_result_codes': {},

  // sick_beast_brd_symptoms
  'health.sick_beast_brd_symptoms': {},

  // cost_codes
  'finance.cost_codes': {
    'revexp_code':  'code',
    'revexp_desc':  'description',
    'rev_exp':      'type',
  },

  // costs
  'finance.costs': {
    'beastid':                    'cow_id',
    'revexp_code':                'cost_code',
    'rev_exp_per_unit':           'unit_cost',
    'extended_revexp':            'total',
    'last_modified_timestamp':    'legacy_modified_at',
  },

  // costs_feed_detail
  'finance.costs_feed_detail': {
    'beastid':                    'cow_id',
    'rev_exp_per_unit':           'unit_cost',
    'units':                      'kgs_fed',
    'extended_revexp':            'feed_cost',
    'ration':                     'ration_code',
    'custom_feed_charge_ton':     'custom_feed_charge_ton',  // may need adding
    'penwhenfed':                 'pen_number',
    'units_drymatter':            'dry_matter',
  },

  // custfeed_lot_summary — huge rewrite, many columns differ
  'finance.custfeed_lot_summary': {
    'drugs_costs_in_period':        'drugs_costs_in_period',
    'drugs_costs_to_date':          'drugs_costs_to_date',
    'comments':                     'comments',
    'cattle_owner_id':              'cattle_owner_id',
    'cattle_owner_details':         'cattle_owner_details',
    'days_invoice_due':             'days_invoice_due',
    'agist_days_for_period':        'agist_days_for_period',
    'agist_days_to_date':           'agist_days_to_date',
    'dry_kgs_feed_period':          'dry_kgs_feed_period',
    'dry_kgs_feed_to_date':         'dry_kgs_feed_to_date',
  },

  // monthly_fl_intake_cost
  'finance.monthly_fl_intake_cost': {
    'rec_id':           'id',
    'month_end_date':   'month_year',
    'seq_no':           'seq_no',
    'section_name':     'section_name',
  },

  // packagecosts
  'finance.packagecosts': {
    'countrycode':              'package_name',
    'basicpackage':             'cost_per_head',
    'priceperthousandhead':     'cost_items',
  },

  // price_adjustment_by_weight_range
  'finance.price_adjustment_by_weight_range': {
    'weight_from':                      'from_weight',
    'weight_to':                        'to_weight',
    'dollars_per_kg_adjustment':        'price_adj',
  },

  // tax_invoice_bank_details
  'finance.tax_invoice_bank_details': {
    'bank_bsb':       'bsb',
    'bank_ac_number':  'acct_number',
    'bank_ac_name':    'acct_name',
  },

  // rcti_payment_grid
  'finance.rcti_payment_grid': {
    'mkt_catgry':       'vendor_id',
    'row_sequence':     'row_sequence',
  },

  // rv_rcti_data
  'finance.rv_rcti_data': {},

  // tr_payment_rates
  'finance.tr_payment_rates': {
    'valid_from_date':    'valid_from_date',
  },

  // tr_payment_breed_adjust
  'finance.tr_payment_breed_adjust': {
    'breedname':             'breed_code',
    'price_per_kg_adjust':   'adjustment',
  },

  // tandr_buying_details
  'finance.tandr_buying_details': {
    'beastid':  'cow_id',
  },

  // beast_accumed_feed_by_commodity
  'finance.beast_accumed_feed_by_commodity': {
    'beastid':                  'cow_id',
    'accumed_kgs':              'total_kgs',
    'accumed_cost':             'total_value',
    'accumed_custfeed_charge':  'total_dry_matter',
    'date_last_updated':        'date_last_updated',
  },

  // purchasing.purchase_lots
  'purchasing.purchase_lots': {
    'agent':                       'agent_id',
    'wbridge_docket':              'wbridge_docket',  // same name (kept?)
    'number_head':                 'numb_head',
    'total_weight':                'total_weight_kg',
    'cost_of_cattle':              'purchase_price_total',
    'cattle_freight_cost':         'freight_cost',
    'lot_notes':                   'notes',
    'invoice_amount':              'cattle_inv_amount',
    'date_cattle_inv_approved':    'cattle_inv_date_approved',
    'buyer_commiss_per_head':      'commission',
    'last_modified_timestamp':     'legacy_modified_at',
  },

  // purchase_totals
  'purchasing.purchase_totals': {
    'tail_tag':   'lot_number',
    'start_date': 'start_date',
    'head':       'total_head',
  },

  // commodity.commodities
  'commodity.commodities': {
    'commod_name':    'commodity_name',
    'kgs_on_hand':    'kgs_on_hand',
    'value_on_hand':  'value_on_hand',
  },

  // commodcontracts
  'commodity.commodcontracts': {
    'start_date':        'delivery_from',
    'end_date':          'delivery_to',
    'price_ton':         'price_per_tonne',
    'wght_contracted':   'quantity_ordered',
    'wght_delivered':    'quantity_delivered',
  },

  // commodtrans
  'commodity.commodtrans': {
    'ref_no':               'docket_no',
    'value':                'total_value',
    'kgs':                  'quantity',
    'staffid':              'staffid',
  },

  // period_stocks_closing_balance
  'commodity.period_stocks_closing_balance': {
    'commodity_name':       'commodity_name',
    'stock_value':          'closing_value',
    'stock_tons_weight':    'closing_qty',
  },

  // breeding
  'breeding.beast_breeding': {
    'birth_date':  'birth_date',
    'birth_wght':  'birth_wght',
    'genetics':    'genetics',
  },

  'breeding.breeding_dams': {
    'dam_supplier': 'dam_supplier',
  },

  'breeding.breeding_sires': {
    'sire_supplier':  'sire_supplier',
    'sire_line_id':   'sire_line',
    'awa_sire_id':    'awa_sire_id',
  },

  // feed tables
  'feed.feeddb_pens_file': {
    'ispaddock':             'ispaddock',
    'include_in_pen_list':   'include_in_pen_list',
    'current_exit_pen':      'current_exit_pen',
  },

  'feed.bunk_code_desc': {
    'bunk_code':     'code',
    'kgs_head_adj':  'kgs_head_adj',
  },

  'feed.bunk_readings': {
    'date_checked':    'observation_date',
    'bunk_reading':    'bunk_code',
    'no_head':         'no_head',
  },

  'feed.feeding_details': {
    'feedingtype':          'variant',
    'feeding_regimen_id':   'feeding_regimen_id',  // may not exist in farm-v3
    'bunk_codes_total':     'bunk_codes_total',
    'kgs_head_adj':         'kgs_head_adj',
    'rec_id':               'rec_id',
  },

  'feed.feeding_regimens': {
    'feedingtype':               'variant',
    'consump_per_head_from':     'kgs_per_head',
    'consump_per_head_to':       'consump_per_head_to',
    'accum_bunkcode_days':       'days',
    'feeding_regimen_id':        'id',
  },

  'feed.ration_descriptions': {
    'current_value_kg':              'cost_per_tonne',
    'superceeded':                   'superceeded',
  },

  'feed.ration_recipe_records': {
    'tolerance_kgs':   'kg_per_tonne',
    'rec_id':          'rec_id',
  },

  'feed.ration_regimes': {
    'feed_date':       'date_started',
    'am_ration':       'am_ration',
    'am_ration_code':  'ration_code',
    'pm_ration':       'pm_ration',
    'pm_ration_code':  'pm_ration_code',
  },

  'feed.ration_calc_constants': {
    'rationcode':   'constant',
    'rationname':   'value',
  },

  'feed.ration_types': {
    'ration_type':   'ration_type_desc',
    'group_name':    'group_name',
  },

  'feed.feed_month_end_date': {
    'current_monthend_date':    'end_date',
    'current_monthstart_date':  'current_monthstart_date',
  },

  'feed.penfeedsdata': {
    'truck_no':                    'truck_no',
    'load_numb_for_day':           'load_numb_for_day',
    'mob_name':                    'mob_name',
    'number_cattle':               'head_fed',
    'feed_weight':                 'kgs_fed',
    'load_recid':                  'load_recid',
    'system_user_id':              'system_user_id',
    'ration_value_per_ton':        'feed_value',
  },

  'feed.paddock_feeding': {
    'beastid': 'cow_id',
  },

  'feed.feedlot_staff': {
    'surname':    'real_name',
    'firstname':  'initials',
  },

  'feed.instrument_calibration_tests': {
    'instrument_name':   'instrument_type',
    'test_date':         'calibration_date',
  },

  'feed.instruments_needing_calibration': {
    'instrument_name':     'instrument_type',
    'date_last_tested':    'last_calibration_date',
    'testing_frequency':   'calibration_frequency_days',
  },

  'feed.vendor_declarations': {
    'qa_program_details':      'qa_details',
    'chem_res_restriction':    'chem_restriction',
    'withholding_for_drugs':   'withholding_drugs',
    'withholding_for_feed':    'withholding_feed',
  },

  // transport tables
  'transport.truck_loads': {
    'truck_no':           'truck_id',
    'load_numb_for_day':  'load_number',
  },

  'transport.truck_names': {
    'truck_number':         'truck_number',
    'max_kgs_load_value':   'capacity',
  },

  'transport.truckloadchangeslog': {
    'truck_name':           'truck_load_id',
    'load_number_for_day':  'change_type',
  },

  'transport.truck_load_variation_data': {
    'truck_load_recid':   'truck_load_id',
  },

  'transport.locations': {
    'commodity':       'pic_number',
    'tons_stored':     'tons_stored',
    'value_stored':    'value_stored',
  },

  'transport.location_changes': {
    'beastid':   'cow_id',
  },

  'transport.deliverydockets': {
    'gross_wght':    'gross_weight',
    'tare_wght':     'tare_weight',
    'payment_wght':  'net_weight',
    'docketnotes':   'notes',
  },

  'transport.manure_carting': {
    'load_date':         'cart_date',
    'truck_name':        'truck_name',
    'tons_nett_weight':  'tonnes',
    'number_of_loads':   'loads',
    'manure_type':       'manure_type',
  },

  'transport.wbridgecomport': {
    'comport':   'port_name',
    'baudrate':  'baud_rate',
    'scaletype': 'data_bits',
  },

  // contacts
  'contacts.contacts': {
    'tel_no':                           'phone',
    'mobile_no':                        'mobile',
    'fax_no':                           'fax',
    'tail_tag_no':                      'tail_tag',
    'bank_ac':                          'account_number',
    'bank_bsb':                         'bsb',
    'days_invoice_due':                 'payment_due_days',
    'agistment_paddock_rate':           'paddock_agistment_rate',
    'agistment_feedlot_rate':           'feedlot_agistment_rate',
    'invoice_careof':                   'invoice_co',
    'abattoir_establishment_number':    'abattoir_establishment_number',
    'last_modified_timestamp':          'legacy_modified_at',
    'salutation':                       'title',
    'contact_type':                     'type',
    'contact_id':                       'id',
  },

  'contacts.contacttypes': {
    'description': 'description',
  },

  'contacts.company': {
    'weight_units':                    'weight_units',
    'usertailtag':                     'usertailtag',
    'rfid_space_removed':              'rfid_space_removed',
    'currentnumberusers':              'currentnumberusers',
    'acn':                             'acn',
    'address':                         'address_1',
  },

  'contacts.company_settings': {
    'modulename':   'setting_key',
    'settingname':  'setting_value',
    'settingvalue': 'setting_type',
    'datecreated':  'datecreated',
    'datemodified': 'datemodified',
  },

  // digistar
  'digistar.digistar_data_history': {
    'truck':              'truck_id',
    'ingred_pen':         'pen_number',
    'trck_mill_loaded':   'trck_mill_loaded',
    'commod_pen':         'commod_pen',
    'wght_delivered':     'actual_weight',
    'call_wght':          'planned_weight',
    'driver_id':          'driver_initials',
    'time_done':          'time_fed',
  },

  'digistar.digistar_users': {
    'user_id':   'user_id',
    'username':  'user_name',
  },

  // system
  'system.code_references_index': {
    'database_table':              'code',
    'field_name':                  'description',
    'lookup_table_name':           'category',
  },

  'system.computer_names': {
    'computer_name': 'computer_name',
  },

  'system.system_info': {
    'date_design_last_updated': 'info_value',
  },

  'system.database_flags': {
    'pens_file_is_open':  'flag_value',
  },

  'system.error_log': {
    'mod_ule':          'module_name',
    'proceedure_name':  'error_details',
    'error_code':       'error_code',
    'user_number':      'user_name',
    'e_value':          'e_value',
  },

  'system.user_log_ons': {
    'term_inal': 'computer_name',
  },

  'system.mmec_table': {
    'dof':                'mmec_code',
    'target_multiplier':  'mmec_desc',
  },

  'system.transaction_types': {
    'trans_type_short': 'trans_desc',
    'trans_type_long':  'trans_desc',
  },

  'system.rv_scheduled_dof': {
    'dof': 'dof_trigger',
  },

  // reporting
  'reporting.month_end_stockonhand': {
    'month_end_date':    'period_date',
    'soh_head':          'head_count',
    'soh_prime_cost':    'total_value',
  },

  'reporting.soh_by_month': {
    'mnth_yyy_ymmm': 'yr_mnth',
    'head':          'head_count',
  },

  'reporting.monthly_adjustment_ob': {
    'month_end_date': 'adj_date',
  },

  'reporting.monthly_agistor_movements': {
    'rec_id':          'id',
    'month_end_date':  'period_date',
  },

  'reporting.monthly_reconciliation': {
    'rec_id':           'id',
    'month_end_date':   'period_date',
    'section_heading':  'section_heading',
  },

  'reporting.monthly_movements': {
    'rec_id':          'id',
    'month_end_date':  'period_date',
  },

  'reporting.mrb_avg_supplier_years': {
    'supplier':      'year',
    'mrb_avg_yr1':   'avg_marbling',
    'mrb_avg_yr2':   'head_count',
  },

  // system.lookups — generally no column renames needed
  'system.lookups': {},

  // system.legacy_raw — column mapping needed!
  'system.legacy_raw': {
    'source_table':   'table_name',
    'row_data':       'raw_data',
    'migrated_at':    'imported_at',
  },

  // system.migration_log — different structure
  'system.migration_log': {
    'source_table':    'version',
    'rows_read':       'description',
    'status':          'status',
    'error_details':   'error_details',
  },
};

// ── Apply transforms ────────────────────────────────────

function applyTransforms(content) {
  let result = content;
  let tableRenames = 0;
  let colRenames = 0;

  // 1. Apply table renames first
  for (const [oldName, newName] of Object.entries(TABLE_RENAMES)) {
    const regex = new RegExp(`targetTable:\\s*'${oldName.replace(/\./g, '\\.')}'`, 'g');
    const newStr = `targetTable: '${newName}'`;
    const count = (result.match(regex) || []).length;
    if (count > 0) {
      result = result.replace(regex, newStr);
      tableRenames += count;
      console.log(`  TABLE: ${oldName} → ${newName} (${count} occurrences)`);
    }
  }

  // 2. Apply universal column renames (globally since they apply to all tables)
  for (const [oldCol, newCol] of Object.entries(UNIVERSAL_COL_RENAMES)) {
    // Match target: 'oldCol' patterns
    const regex = new RegExp(`target:\\s*'${oldCol}'`, 'g');
    const newStr = `target: '${newCol}'`;
    const count = (result.match(regex) || []).length;
    if (count > 0) {
      result = result.replace(regex, newStr);
      colRenames += count;
      console.log(`  COL (universal): ${oldCol} → ${newCol} (${count} occurrences)`);
    }
    // Also match in staticColumns: { oldCol: ... }
    const staticRegex = new RegExp(`(staticColumns:\\s*\\{[^}]*?)\\b${oldCol}\\b:`, 'g');
    const staticCount = (result.match(staticRegex) || []).length;
    if (staticCount > 0) {
      result = result.replace(staticRegex, `$1${newCol}:`);
      colRenames += staticCount;
    }
  }

  // 3. Apply table-specific column renames
  // These need to be applied within the context of the correct targetTable block.
  // Strategy: find each mapping block, check its targetTable, apply renames within that block.
  for (const [tableName, colMap] of Object.entries(TABLE_COL_RENAMES)) {
    for (const [oldCol, newCol] of Object.entries(colMap)) {
      if (oldCol === newCol) continue;  // skip same-name mappings
      
      // Apply globally since we trust the mapping is correct per-table
      // (most column names are used only in one table's mapping)
      const regex = new RegExp(`target:\\s*'${oldCol}'`, 'g');
      const newStr = `target: '${newCol}'`;
      const count = (result.match(regex) || []).length;
      if (count > 0) {
        result = result.replace(regex, newStr);
        colRenames += count;
        console.log(`  COL [${tableName}]: ${oldCol} → ${newCol} (${count} occurrences)`);
      }
      
      // Also check staticColumns keys
      const staticKeyRegex = new RegExp(`(staticColumns:\\s*\\{\\s*)${oldCol}:`, 'g');
      const staticCount = (result.match(staticKeyRegex) || []).length;
      if (staticCount > 0) {
        result = result.replace(staticKeyRegex, `$1${newCol}:`);
        colRenames += staticCount;
        console.log(`  STATIC [${tableName}]: ${oldCol} → ${newCol} (${staticCount} occurrences)`);
      }
    }
  }

  console.log(`\nTotal: ${tableRenames} table renames, ${colRenames} column renames applied`);
  return result;
}

// ── Main ────────────────────────────────────────────────
const mappingsPath = path.join(__dirname, 'mappings.js');
const content = fs.readFileSync(mappingsPath, 'utf8');
const transformed = applyTransforms(content);

if (dryRun) {
  console.log('\n=== DRY RUN — no changes written ===');
} else {
  fs.writeFileSync(mappingsPath, transformed, 'utf8');
  console.log('\n✓ mappings.js updated');
}

// ── Validate: check all target columns exist in schema-farm-v3.sql ──
console.log('\n=== VALIDATION ===');
function parseSchema(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  const tableRegex = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([\w.]+)\s*\(/gi;
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const startIdx = match.index + match[0].length;
    let depth = 1, i = startIdx;
    while (i < sql.length && depth > 0) {
      if (sql[i] === '(') depth++;
      if (sql[i] === ')') depth--;
      i++;
    }
    const body = sql.slice(startIdx, i - 1);
    const columns = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('CONSTRAINT') ||
          trimmed.startsWith('PRIMARY') || trimmed.startsWith('CHECK') ||
          trimmed.startsWith('UNIQUE') || trimmed.startsWith('FOREIGN') ||
          trimmed.startsWith(')')) continue;
      const colMatch = trimmed.match(/^"?(\w+)"?\s+/);
      if (colMatch) {
        const colName = colMatch[1].toLowerCase();
        if (['partition', 'like', 'inherits', 'tablespace'].includes(colName)) continue;
        columns.push(colName);
      }
    }
    tables[tableName] = columns;
  }
  return tables;
}

const schema = parseSchema(path.join(__dirname, 'schema-farm-v3.sql'));

// Extract all targetTable + target column pairs from the TRANSFORMED mappings
const targetTableRegex = /targetTable:\s*'([^']+)'/g;
const mappingBlockRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;

// Simple approach: extract all unique targetTable → column sets
const issues = [];
let m;
const transformedContent = dryRun ? transformed : fs.readFileSync(mappingsPath, 'utf8');

// Parse mapping blocks
const allBlocks = transformedContent.match(/\{\s*order:\s*\d+[\s\S]*?\n  \}/g) || [];
console.log(`Found ${allBlocks.length} mapping blocks`);

let missingTables = 0;
let missingCols = 0;
for (const block of allBlocks) {
  const tableMatch = block.match(/targetTable:\s*'([^']+)'/);
  if (!tableMatch) continue;
  const table = tableMatch[1];
  
  if (!schema[table]) {
    issues.push(`MISSING TABLE: ${table}`);
    missingTables++;
    continue;
  }
  
  const colRegex = /target:\s*'([^']+)'/g;
  let cm;
  while ((cm = colRegex.exec(block)) !== null) {
    const col = cm[1];
    if (!schema[table].includes(col)) {
      issues.push(`MISSING COLUMN: ${table}.${col}`);
      missingCols++;
    }
  }
  
  // Check staticColumns keys
  const staticMatch = block.match(/staticColumns:\s*\{([^}]+)\}/);
  if (staticMatch) {
    const staticKeys = staticMatch[1].match(/(\w+)\s*:/g);
    if (staticKeys) {
      for (const sk of staticKeys) {
        const key = sk.replace(/\s*:$/, '');
        if (!schema[table].includes(key)) {
          issues.push(`MISSING STATIC COL: ${table}.${key}`);
          missingCols++;
        }
      }
    }
  }
}

if (issues.length > 0) {
  console.log(`\n${missingTables} missing tables, ${missingCols} missing columns:`);
  // Group by table
  const grouped = {};
  for (const issue of issues) {
    const [type, detail] = issue.split(': ');
    const table = detail.split('.').slice(0, 2).join('.');
    if (!grouped[table]) grouped[table] = [];
    grouped[table].push(issue);
  }
  for (const [table, tableIssues] of Object.entries(grouped).sort()) {
    console.log(`\n  ${table}:`);
    for (const i of tableIssues) console.log(`    ${i}`);
  }
} else {
  console.log('All tables and columns validated OK!');
}
