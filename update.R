# R code to update the HOF voting viz after election results are released
rm(list=ls())
setwd("~/Stats/mlb-hall-of-fame-voting/")

# First, update election_data.csv:

# 1. Download vorting results from baseball-reference.com as .csv file
# 2. From excel, insert Year = [current year] as first column
# 3. Replace "X-" with "" in the player name column
# 4. Change YoB to be an integer (remove "th" and "st", etc.)
# 5. Insert column for number of ballots that were returned this year
# 6. Use an excel formula to set up percentage without the "%" signs
# 7. Copy the first 7 columns into the election_data.csv file at the top

# Next, update players_data.csv

# 1. Download vorting results from baseball-reference.com as .csv file (same first step)
# 2. Remove the first column and the first row
# 3. Replace "X-" with "" in the name column
# 4. Change the last column name, "Pos Summary" to "pos" (to avoid multibyte string problem)

# read the updated voting results into R:
update <- read.csv("results2015.csv", as.is = TRUE)

# read in players data:
player <- read.csv("player_data.csv", as.is = TRUE)

# Find the rows in player that we have an update for (2nd year or later on ballot):
m <- match(update[, "Name"], player[, "Name"])

# read in new election data:
election <- read.csv("election_data.csv", as.is = TRUE)

# copy column names from existing file to update:
colnames(update) <- colnames(player)[1:35]

# compute the other seven variables for the new players:
#colnames(player)[36:42]

# position:
main.pos <- substr(gsub("/", "", gsub("*", "", update[, "PosSummary"], fixed = TRUE), fixed = TRUE), 1, 1)
position <- c("P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH")[match(main.pos, c(1:9, "D"))]

# method:
n <- dim(update)[1]
method <- numeric(n)
induction.year <- numeric(n)
Num.Years.On.Ballot <- numeric(n)
for (i in 1:n) {
  sel <- election[, "Name"] == update[i, "Name"]
  # just a 1 if they were elected by the BBWAA
  # worry about veteran's committee some other time...
  method[i] <- as.numeric(sum(election[sel, "pct"] >= 75) > 0)
  # assume election years for players are in descending order by year:
  induction.year[i] <- ifelse(method[i] == 1, election[sel, "Year"][1], 0)
  Num.Years.On.Ballot[i] <- sum(sel)
}

# first and last year (assuming no skipped years -- not always true, but whatever...)
last.year <- numeric(n)
last.year[is.na(m)] <- 2009

first.year <- numeric(n)
first.year[is.na(m)] <- last.year[is.na(m)] - update[is.na(m), "Yrs"] + 1

# read in mitchell report and check the new players:
mitchell.data <- read.csv("mitchell_report.csv", as.is = TRUE)
mitchell.report <- as.numeric(update[, "Name"] %in% mitchell.data[, 1])

update <- data.frame(update, 
                     position, 
                     method, 
                     induction.year, 
                     first.year, 
                     last.year, 
                     Num.Years.On.Ballot, 
                     mitchell.report, 
                     stringsAsFactors = FALSE)

# update them:
cols <- c("method", "induction.year", "Num.Years.On.Ballot")
player[m[!is.na(m)], cols] <- update[!is.na(m), cols]

# add in the first-ballot players:
player <- rbind(update[is.na(m), ], player)

#write.csv(player, file = "player_data_new.csv", row.names = FALSE)












