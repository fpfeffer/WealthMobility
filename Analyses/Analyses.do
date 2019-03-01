********************************************************************************
*** Intergenerational Wealth Mobility and Racial Inequality ********************
*** Replication Code                                        ********************
*** Last update: 2018-12-28, FP                             ********************
********************************************************************************

* Note: Input file is part of replication package to Pfeffer/Killewald 2018
*       and can be downloaded here: http://doi.org/10.3886/E101094V1

global path    "[set user path]"
global pathout "$path/Output"

***************************************************************************
*** TABLE OF CONTENTS *****************************************************
***************************************************************************

/*
1) Preparation of Variables
2) Sample Selection
3) Main Analyses
4) Supplementary Analyses
*/

***************************************************************************
*** PREPARE VARIABLES *****************************************************
***************************************************************************

use "$path/TwoGenerations.dta", clear

* Female
sum female

* Weights
	* 1984 family weight
gen fw=pw1984
lab var fw "Weight 1 (family weight)"
	* 2013 individual weight
gen iw=iw2013
lab var iw "Weight 2 (individual weight)"

* Sample Indicator
	* SRC vs. SEO sample
gen     src=.
replace src=1 if fid68<=2930
replace src=0 if fid68>=5001 & fid68<=6872
lab var src "SRC sample?"
lab val src yesno
tab src
	
* Race (White vs. Black)
	* Main indicator (based on first mention)
gen     white=.
replace white=1 if race2013==1
replace white=0 if race2013==2
lab var white "White?"
lab val white yesno
	* Alternative indicator (based on four mentions)
	* Only White, Only Black, Only Other, Multiracial, Any Hispanic
gen     white2=.
replace white2=1 if racemult22013==1
replace white2=0 if racemult22013>=2 & racemult22013<.
lab var white2 "White? (alternative version based on up to four mentions"
lab val white2 yesno
	* Compare
tab white white2
		* Only 79 cases switch from white to non-white
	
* Quintiles, Quartiles, Terciles, Percentiles
* Drawn within wealth distribution of age group (45-64)
foreach x in wealth pwealth {
foreach q in 3 4 5 100 {
	xtile `x'`q'=`x' if agegr_2==2 [aw=iw], n(`q') /* using individual weight */
	xtile `x'`q'_uw=`x' if agegr_2==2, n(`q') /* unweighted (for SRC only analysis) */
	}
	}
	* Labels
lab drop quintiles quartiles
lab def quintiles 1 "Lowest Quintile" 2 "Quintile 2" 3 "Quintile 3" 4 "Quintile 4" 5 "Highest Quintile"
lab def quartiles 1 "Lowest Quartile" 2 "Quartile 2" 3 "Quartile 3" 4 "Highest Quartile"
lab def terciles  1 "Lowest Tercile" 2 "Middle Tercile" 3 "Highest Tercile"
lab def percentiles 1 "Lowest Percentile" 100 "Highest Percentile"
	* Label child wealth
		* Weighted
rename wealth3 wealthtr
rename wealth4 wealthqr
rename wealth5 wealthqn
rename wealth100 wealthpt
lab var wealthtr "Wealth terciles"
lab var wealthqr "Wealth quartiles"
lab var wealthqn "Wealth quintiles"
lab var wealthpt "Wealth percentiles"
lab val wealthtr terciles
lab val wealthqr quartiles
lab val wealthqn quintiles
lab val wealthpt percentiles
		* Unweighted
rename wealth3_uw wealthtr_uw
rename wealth4_uw wealthqr_uw
rename wealth5_uw wealthqn_uw
rename wealth100_uw wealthpt_uw
lab var wealthtr_uw "Wealth terciles (unweighted)"
lab var wealthqr_uw "Wealth quartiles (unweighted)"
lab var wealthqn_uw "Wealth quintiles (unweighted)"
lab var wealthpt_uw "Wealth percentiles (unweighted)"
lab val wealthtr_uw terciles
lab val wealthqr_uw quartiles
lab val wealthqn_uw quintiles
lab val wealthpt_uw percentiles
	* Label parent wealth
		* Weighted
rename pwealth3 pwealthtr
rename pwealth4 pwealthqr
rename pwealth5 pwealthqn
rename pwealth100 pwealthpt
lab var pwealthtr "Parental wealth terciles"
lab var pwealthqr "Parental wealth quartiles"
lab var pwealthqn "Parental wealth quintiles"
lab var pwealthpt "Parental wealth percentiles"
lab val pwealthtr terciles
lab val pwealthqr quartiles
lab val pwealthqn quintiles
lab val pwealthpt percentiles
		* Unweighted
rename pwealth3_uw pwealthtr_uw
rename pwealth4_uw pwealthqr_uw
rename pwealth5_uw pwealthqn_uw
rename pwealth100_uw pwealthpt_uw
lab var pwealthtr_uw "Parental wealth terciles (unweighted)"
lab var pwealthqr_uw "Parental wealth quartiles (unweighted)"
lab var pwealthqn_uw "Parental wealth quintiles (unweighted)"
lab var pwealthpt_uw "Parental wealth percentiles (unweighted)"
lab val pwealthtr_uw terciles
lab val pwealthqr_uw quartiles
lab val pwealthqn_uw quintiles
lab val pwealthpt_uw percentiles


***************************************************************************
*** SELECT & SAVE DATA ****************************************************
***************************************************************************

* Select
	* Restrict to older age group (45-64)
keep if agegr_2==2
	* Drop other race (N=64)
keep if white!=.
	* Drop case with missing weight
drop if iw==.

* Save
order id fw iw src white* female wealth pwealth *wealthqr* *wealthqn* *wealthtr* *wealthpt* page1984 age2013 agegr_2
keep  id fw iw src white* female wealth pwealth *wealthqr* *wealthqn* *wealthtr* *wealthpt* page1984 age2013 agegr_2 
sum
lab data "Wealth Mobility Data Visualization, $S_DATE"
save "$path/Final.dta", replace


***************************************************************************
*** MAIN ANALYSES *********************************************************
***************************************************************************

log using "$pathout/Log.txt", text replace

*--------------------------------------------------------------------------
* Descriptives
*--------------------------------------------------------------------------

use "$path/Final.dta", clear

* Ages
sum page1984 age2013 [aw=iw]

* Sample Sizes
count
tab src
tab src white

* Difference in racial indicators
tab white white2

*--------------------------------------------------------------------------
* Animation 1: Transition Probabilities
*--------------------------------------------------------------------------

use "$path/Final.dta", clear

* Ordered logistic model
ologit wealthqn i.pwealthqn i.white i.pwealthqn#i.white [aw=iw]
mtable, at(white=(0 1) pwealthqn=(1 2 3 4 5))

* For fully automated output of predicted probabilities, mgen command can be used
* but piecewise to construct a true long file (origin by destination by race)
foreach i of numlist 1/5 {
	preserve
	mgen, at(white=(0 1) pwealthqn=(1 2 3 4 5)) outcome(`i')
	keep _pwealthqn _white _pr`i'
	rename _pwealthqn pwealth
	rename _white white
	rename _pr`i' prob
	gen wealth=`i'
	drop if prob==.
	order pwealth wealth white prob
	lab val pwealth quintiles
	lab val wealth quintiles
	lab val white yesno
	save "$path/q`i'.dta", replace
	restore
	}

* Export
use "$path/q1.dta", clear
foreach i of numlist 2/5 {
	append using "$path/q`i'.dta"
	erase "$path/q`i'.dta"
	}
erase "$path/q1.dta"
rename pwealth origin
rename wealth destination
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d
sort white origin destination
save "$pathout/ologit.dta", replace
export delimited using "$pathout/1-mobility-rates.csv", replace

*--------------------------------------------------------------------------
* Animation 2: Wealth Structure
*--------------------------------------------------------------------------

use "$path/Final.dta", clear

gen n=.
lab var n "Weighted Frequency"

* Crosstabulation: White
tab pwealthqn wealthqn if white==1 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==1, by(pwealthqn wealthqn)
	* Multiply frequencies byaverage race weight to scale to population race distribution
	sum iw if white==1
	replace n=x*r(mean) if white==1
	drop x

* Crosstabulation: Black
tab pwealthqn wealthqn if white==0 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==0, by(pwealthqn wealthqn)
	* Multiply frequencies byaverage race weight to scale to population race distribution
	sum iw if white==0
	replace n=x*r(mean) if white==0 
	drop x	
	* Add zero cells
	set obs `=_N+3'
		replace n=0           if _n==_N-2    
		replace white=0       if _n==_N-2
		replace pwealthqn=4   if _n==_N-2
		replace wealthqn=3    if _n==_N-2
		replace n=0           if _n==_N-1    
		replace white=0       if _n==_N-1
		replace pwealthqn=4   if _n==_N-1
		replace wealthqn=5    if _n==_N-1
		replace n=0           if _n==_N    
		replace white=0       if _n==_N
		replace pwealthqn=5   if _n==_N
		replace wealthqn=5    if _n==_N
	
* Export
rename pwealthqn origin
rename wealthqn destination
keep white origin destination n
duplicates drop
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d
sort white origin destination
export delimited using "$pathout/2-wealth-structure.csv", replace

* Share of mobile cases (attained quintile is different from parents')
use "$path/Final.dta", clear
gen mobile=.
lab var mobile "Changed quintiles?"
lab val mobile yesno
replace mobile=0 if pwealthqn==wealthqn
replace mobile=1 if pwealthqn!=wealthqn
bysort white: tab mobile [aw=iw]
	* Compare
	tab pwealthqn wealthqn if white==1 [aw=iw]
	tab pwealthqn wealthqn if white==0 [aw=iw]


***************************************************************************
*** SUPPLEMENTARY ANALYSES ************************************************
***************************************************************************

*--------------------------------------------------------------------------
* Animation S.1: Transition probabilities under different modeling approaches
*--------------------------------------------------------------------------

use "$path/Final.dta", clear

* Main model: Ordered logistic (jointly estimated)
ologit wealthqn i.pwealthqn i.white i.pwealthqn#i.white [aw=iw]
		* Testing proportionality constraints [ssc install oparallel]
		* Note: oparallel so far only works with "version 14" and unweighted
		version 14
		ologit wealthqn i.pwealthqn i.white i.pwealthqn#i.white
		oparallel, ic
			* Brant test cannot be performed due to perfect prediction issues noted above

* Specification Check: Ordered logistic (separately estimated)
* Accomodates not only race differences in transition rates (origin*race interaction)
* but also in proportionality constraint
	* White
ologit wealthqn i.pwealthqn if white==1 [aw=iw]
mtable, at(pwealthqn=(1 2 3 4 5))
		* Testing proportionality constraints [ssc install oparallel]
		version 14
		ologit wealthqn i.pwealthqn if white==1
		oparallel, ic /* global test for joint proportionality of all coefficients */
		brant         /* test proportionality of single coefficients */
		* Save predicted probabilities
		ologit wealthqn i.pwealthqn if white==1 [aw=iw]
		foreach i of numlist 1/5 {
			preserve
			mgen, at(pwealthqn=(1 2 3 4 5)) outcome(`i')
			keep _pwealthqn _pr`i'
			rename _pwealthqn pwealth
			rename _pr`i' ologit_sep
			gen white=1
			gen wealth=`i'
			drop if ologit_sep==.
			order pwealth wealth white
			lab val pwealth quintiles
			lab val wealth quintiles
			lab val white yesno
			save "$path/q`i'.dta", replace
			restore
			}
		preserve
		use "$path/q1.dta", clear
		foreach i of numlist 2/5 {
			append using "$path/q`i'.dta"
			erase "$path/q`i'.dta"
			}
		erase "$path/q1.dta"
		sort white pwealth wealth
		save "$pathout/ologit_white.dta", replace
		restore
	* Black
ologit wealthqn i.pwealthqn if white==0 [aw=iw]
mtable, at(pwealthqn=(1 2 3 4 5))
		* Testing proportionality constraints [ssc install oparallel]
		version 14
		ologit wealthqn i.pwealthqn if white==0 & pwealthqn<4 /* when q5 q4 included: perfect prediction */
		oparallel
		* Save predicted probabilities
		ologit wealthqn i.pwealthqn if white==0 [aw=iw]
		foreach i of numlist 1/5 {
			preserve
			mgen, at(pwealthqn=(1 2 3 4 5)) outcome(`i')
			keep _pwealthqn _pr`i'
			rename _pwealthqn pwealth
			rename _pr`i' ologit_sep
			gen white=0
			gen wealth=`i'
			drop if ologit_sep==.
			order pwealth wealth white
			lab val pwealth quintiles
			lab val wealth quintiles
			lab val white yesno
			save "$path/q`i'.dta", replace
			restore
			}
		preserve
		use "$path/q1.dta", clear
		foreach i of numlist 2/5 {
			append using "$path/q`i'.dta"
			erase "$path/q`i'.dta"
			}
		erase "$path/q1.dta"
		sort white pwealth wealth
		save "$pathout/ologit_black.dta", replace
		append using "$pathout/ologit_white.dta"
		order pwealth wealth white
		rename pwealth origin
		rename wealth destination
		save "$pathout/ologit_sep.dta", replace
		erase "$pathout/ologit_white.dta"
		erase "$pathout/ologit_black.dta"
		restore

* Specification Check: Stereotype logistic regression
slogit wealthqn i.pwealthqn i.white i.pwealthqn#i.white [pw=iw]
mtable, at(white=(0 1) pwealthqn=(1 2 3 4 5))
	* Save predicted probabilities
	foreach i of numlist 1/5 {
		preserve
		mgen, at(white=(0 1) pwealthqn=(1 2 3 4 5)) outcome(`i')
		keep _pwealthqn _white _pr`i'
		rename _pwealthqn pwealth
		rename _white white
		rename _pr`i' stereo
		gen wealth=`i'
		drop if stereo==.
		order pwealth wealth white
		lab val pwealth quintiles
		lab val wealth quintiles
		lab val white yesno
		save "$path/q`i'.dta", replace
		restore
		}
	preserve
	use "$path/q1.dta", clear
	foreach i of numlist 2/5 {
		append using "$path/q`i'.dta"
		erase "$path/q`i'.dta"
		}
	erase "$path/q1.dta"
	sort white pwealth wealth
	rename pwealth origin
	rename wealth destination
	save "$pathout/stereo.dta", replace
	restore
		
* Specification Check: Multinomial logistic regression (saturated = observed probabilities)
mlogit wealthqn i.pwealthqn i.white i.pwealthqn#i.white [pw=iw], base(1) iter(1000)
mtable, at(white=(0 1) pwealthqn=(1 2 3 4 5))
bysort white: tab pwealthqn wealthqn [aw=iw], nof row
	* Save predicted probabilities
	foreach i of numlist 1/5 {
		preserve
		mgen, at(white=(0 1) pwealthqn=(1 2 3 4 5)) outcome(`i')
		keep _pwealthqn _white _pr`i'
		rename _pwealthqn pwealth
		rename _white white
		rename _pr`i' mlogit
		gen wealth=`i'
		drop if mlogit==.
		order pwealth wealth white
		lab val pwealth quintiles
		lab val wealth quintiles
		lab val white yesno
		save "$path/q`i'.dta", replace
		restore
		}
	preserve
	use "$path/q1.dta", clear
	foreach i of numlist 2/5 {
		append using "$path/q`i'.dta"
		erase "$path/q`i'.dta"
		}
	erase "$path/q1.dta"
	sort white pwealth wealth
	rename pwealth origin
	rename wealth destination
	save "$pathout/mlogit.dta", replace
	restore

* Export predicted probabilities from all models
use "$pathout/ologit.dta", clear
rename prob ologit
merge 1:1 origin destination white using "$pathout/ologit_sep.dta"
drop _merge 
merge 1:1 origin destination white using "$pathout/stereo.dta"
drop _merge  
merge 1:1 origin destination white using "$pathout/mlogit.dta"
drop _merge
export delimited using "$pathout/s1-models.csv", replace

* Erase files
foreach m in ologit ologit_sep stereo mlogit {
	erase "$pathout/`m'.dta"
	}

/* Note:
- A linear model produces strong regression to the mean and adding a randomly
  drawn residual is not an adequate solution as the residuals are large; see
  Appendix below
- A variety of log-linear and log-multiplicate models for mobility tables
  tables approaches would also be available but are not pursued here 
*/        

*--------------------------------------------------------------------------
* Animation S.2: Wealth quartile mobility based on different samples
*--------------------------------------------------------------------------

*** Full Sample

use "$path/Final.dta", clear
gen n=.
lab var n "Weighted Frequency"

* Crosstabulation: White
tab pwealthqr wealthqr if white==1 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==1, by(pwealthqr wealthqr)
	* Multiply frequencies by average race weight to scale to population race distribution
	sum iw if white==1
	replace n=x*r(mean) if white==1
	drop x

* Crosstabulation: Black
tab pwealthqr wealthqr if white==0 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==0, by(pwealthqr wealthqr)
	* Multiply frequencies byaverage race weight to scale to population race distribution
	sum iw if white==0
	replace n=x*r(mean) if white==0 
	drop x	
	* Add zero cells
	set obs `=_N+1'
		replace n=0           if _n==_N    
		replace white=0       if _n==_N
		replace pwealthqr=4   if _n==_N
		replace wealthqr=4    if _n==_N

* Export
rename pwealthqr origin
rename wealthqr destination
keep white origin destination n
duplicates drop
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d
sort white origin destination
export delimited using "$pathout/s2-quartiles.csv", replace
		
		
*** SRC Sample only (no weights!)		

use "$path/Final.dta", clear

keep if src==1

gen n=.
lab var n "Unweighted Frequency"

* Crosstabulation: White, Only SRC Sample (no weights!)
tab pwealthqr_uw wealthqr_uw if white==1
	* Save frequencies
	egen x=count(1) if white==1, by(pwealthqr_uw wealthqr_uw)
	replace n=x if white==1
	drop x
	
* Crosstabulation: Black, Only SRC Sample (no weights!)
tab pwealthqr_uw wealthqr_uw if white==0
	* Save frequencies
	egen x=count(1) if white==0, by(pwealthqr_uw wealthqr_uw)
	replace n=x if white==0
	drop x
	* Add zero cells
	set obs `=_N+3'
		replace n=0              if _n==_N-2    
		replace white=0          if _n==_N-2
		replace pwealthqr_uw=4   if _n==_N-2
		replace wealthqr_uw=1    if _n==_N-2
		replace n=0              if _n==_N-1    
		replace white=0          if _n==_N-1
		replace pwealthqr_uw=4   if _n==_N-1
		replace wealthqr_uw=2    if _n==_N-1
		replace n=0              if _n==_N    
		replace white=0          if _n==_N
		replace pwealthqr_uw=1   if _n==_N
		replace wealthqr_uw=4    if _n==_N
			
* Export
rename pwealthqr_uw origin
rename wealthqr_uw destination
keep white origin* destination* n*
duplicates drop
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d n
sort white origin destination
export delimited using "$pathout/s2-quartiles-srconly.csv", replace


*--------------------------------------------------------------------------
* Animation S.3: Wealth tercile mobility based on different samples
*--------------------------------------------------------------------------

*** Full Sample

use "$path/Final.dta", clear
gen n=.
lab var n "Weighted Frequency"

* Crosstabulation: White
tab pwealthtr wealthtr if white==1 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==1, by(pwealthtr wealthtr)
	* Multiply frequencies by average race weight to scale to population race distribution
	sum iw if white==1
	replace n=x*r(mean) if white==1
	drop x

* Crosstabulation: Black
tab pwealthtr wealthtr if white==0 [aw=iw]
	* Save frequencies (relies on ado file "egenmore" for weighted frequencies)
	egen x=wtfreq(iw) if white==0, by(pwealthtr wealthtr)
	* Multiply frequencies byaverage race weight to scale to population race distribution
	sum iw if white==0
	replace n=x*r(mean) if white==0 
	drop x	

* Export
rename pwealthtr origin
rename wealthtr destination
keep white origin destination n
duplicates drop
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d
sort white origin destination
export delimited using "$pathout/s3-terciles.csv", replace
		
*** SRC Sample only (no weights!)		

use "$path/Final.dta", clear

keep if src==1

gen n=.
lab var n "Unweighted Frequency"

* Crosstabulation: White, Only SRC Sample (no weights!)
tab pwealthtr_uw wealthtr_uw if white==1
	* Save frequencies
	egen x=count(1) if white==1, by(pwealthtr_uw wealthtr_uw)
	replace n=x if white==1
	drop x
	
* Crosstabulation: Black, Only SRC Sample (no weights!)
tab pwealthtr_uw wealthtr_uw if white==0
	* Save frequencies
	egen x=count(1) if white==0, by(pwealthtr_uw wealthtr_uw)
	replace n=x if white==0
	drop x
			
* Export
rename pwealthtr_uw origin
rename wealthtr_uw destination
keep white origin* destination* n*
duplicates drop
	* Create copies without labels
gen o=origin
gen d=destination
gen w=white
order white origin destination w o d n
sort white origin destination
export delimited using "$pathout/s3-terciles-srconly.csv", replace

log close
