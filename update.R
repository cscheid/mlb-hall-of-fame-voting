# R code to update the HOF voting viz after election results are released
setwd("~/public_git/mlb-hall-of-fame-voting/")
library(dplyr)

# First, update election_data.csv:

# 1. Download voting results from baseball-reference.com as .csv file
# 2. From excel, insert Year = [current year] as first column
# 3. Replace "X-" with "" in the player name column
# 4. Change YoB to be an integer (remove "th" and "st", etc.)
# 5. Insert column (after Votes) for number of ballots that were returned this year
# 6. Use an excel formula to set up percentage without the "%" signs
# 7. Copy the first 7 columns into the election_data.csv file at the top

# Next, update players_data.csv

# 1. Download voting results from baseball-reference.com as .csv file (same first step)
# 2. Remove the first column
# 3. Replace "X-" with "" in the name column
# 4. Change the last column name, "Pos Summary" to "pos" (to avoid multibyte string problem)
# 5. Remove the rows with voting info, so it looks like results2015.csv, for example

# read the updated voting results into R:
# update <- read.csv("results2016.csv", as.is = TRUE)
update <- read.csv("player_add.csv", as.is = TRUE)
update <- unique(update)
update <- update[, 1:35]

# read in players data: (rename 'player_data.csv' to 'player_data_old.csv')
player <- read.csv("player_data_old.csv", as.is = TRUE)

# Find the rows in player that we have an update for (2nd year or later on ballot):
m <- match(update[, "Name"], player[, "Name"])

# read in new election data:
election <- read.csv("election_data.csv", as.is = TRUE)

# copy column names from existing file to update:
colnames(update) <- colnames(player)[1:35]

# compute the other seven variables for the new players:
#colnames(player)[36:42]

# assign main/primary position:
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
last.year[is.na(m)] <- 2009  # this was hard-coded for 2015 inductees; fixed below

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

# Now fix the 'last year (and first year) played in MLB' variables
# filter(election, YoB == 1) %>% 
#   nrow()

new_player <- player %>%
  left_join(election %>% filter(YoB == 1) %>%
              filter(!duplicated(Name)) %>%
              select(Name, Year), 
            by = "Name") %>%
  mutate(last_year = Year - 6, 
         first_year = last_year - Yrs + 1)

# flag the players that need to be fixed:
fix <- new_player$last_year >= 2010
new_player$last.year[fix] <- new_player$last_year[fix]
new_player$first.year[fix] <- new_player$first_year[fix]



# select(new_player, Name, Yrs, first.year, last.year, first_year, last_year) %>%
#   head(200)
# 
# filter(new_player, last_year != last.year) %>%
#   select(Name, Yrs, position, first.year, last.year, first_year, last_year)

# OK, looks like I made a correction for all players whose careers ended in 2010. 
# Earlier career start/end dates were correct, so don't mess with them.

new_player <- select(new_player, -Year, -first_year, -last_year)
write.csv(new_player, file = "player_data.csv", row.names = FALSE)


# write out a file of BBWAA hall of famers:
hof <- filter(election, pct >= 75) %>%
  arrange(YoB, desc(pct))
write.csv(hof, file = "~/personal/hof_players_thru_2020.csv", row.names = FALSE)


# Add in Veteran's committee players who were elected between 2013 and 2020:
# (Ron Santo was the last one I had here, from the original version of the viz)

# Joe Torre, veterans committee, manager, 2014
# Alan Trammell, veterans committee, player, 2018
# Jack Morris, veterans committee, player, 2018
# Harold Baines, veterans committee, player, 2019
# Lee Smith, veterans committee, player, 2019
# Ted Simmons, veterans committee, player, 2020


