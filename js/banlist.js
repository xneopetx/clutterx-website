// List of banned word patterns using regex
const bannedWordsPatterns = [
    // N-word variants
    /n[i1!|][g9q][g9q][e3][r2]/i,
    /n[i1!|]g[g9q][a@4][r2]/i,
  
    // Chink and variations
    /c[h][i1!|][n][k]/i,
  
    // Gook
    /g[o0][o0][k]/i,
  
    // Kike
    /k[i1!|][k][e3]/i,
  
    // Coon
    /c[o0][o0][n]/i,
  
    // Raghead
    /r[a@4][g9q][h][e3][a@4][d]/i,
  
    // Sandnigger
    /s[a@4][n][d][n][i1!|][g9q][g9q][e3][r2]/i,
  
    // Wop
    /w[o0][p]/i,
  
    // Jap
    /j[a@4][p]/i,
  
    // Pak(i) (Pakis)
    /p[a@4][k][i1!|]/i,
  
    // Ziphead
    /z[i1!|][p][p][e3][r][h][e3][a@4][d]/i,
  
    // Groid
    /g[r][o0][i1!|][d]/i,
  
    // Faggot variants
    /f[a@4][g9q][g9q][o0][t7]/i,
    /f[a@4][g9q][g9q][o0][t7][s5$]?/i,
  
    // Tranny variants
    /t[r][a@4][n][n][y]/i,
    /t[r][a@4][n][n][i1!|]/i,
  
    // Shemale
    /s[h][e3][m][a@4][l1!|][e3]/i,
  
    // Homo / Homosexual slurs
    /h[o0][m][o0]/i,
    /h[o0][m][o0][s5$]/i,
  
    // Retard and variants
    /r[e3][t7][a@4][r][d]/i,
    /r[e3][t7][a@4][r][d][s5$]?/i,
  
    // Spaz
    /s[p][a@4][z]/i,
  
    // Mong (short for mongoloid)
    /m[o0][n][g9q]/i,
  
    // Kaffir variants
    /k[a@4][f][f][i1!|]r/i,
  
    // Heathen
    /h[e3][a@4][t7][h][e3][n]/i,
  
    // Infidel
    /i[n][f][i1!|][d][e3][l]/i,
  
    // Terrorist
    /t[e3][r][r][o0][r][i1!|][s5$][t7]/i,
  
    // Islamist
    /i[s5$][l][a@4][m][i1!|][s5$][t7]/i,
  
    // Camel Jock
    /c[a@4][m][e3][l]\s*j[o0][c][k]/i,
  
    // Uncivilized
    /u[n][c][i1!|][v][i1!|][l][i1!|][z][e3][d]/i,
  
    // Savages
    /s[a@4][v][a@4][g9q][e3][s5$]?/i,
  
    // Additional common variants of above, e.g. spacing, leetspeak
    /n[i1!|][g9q][g9q][e3][r2]/i,
    /f[a@4][g9q][g9q][o0][t7]/i,
    /s[h][e3][m][a@4][l1!|][e3]/i,
    /t[r][a@4][n][n][y]/i,
    /c[u*][n][t]/i,
    /b[i1!|][t7][c][h]/i,
    /d[i1!|][c][k]/i,
    /p[e3][n][i1!|][s]/i,
    /p[u*][s][s][y]/i,
    /j[e3][r][k]/i,
    /w[h][o0][r][e]/i,
    /s[l1!|][u*][t]/i,
    /b[i1!|][m][b][o0]/i,
    /g[o0][l][d][d][i1!|][g9q][g9q][e3][r]/i,
    /d[u*][m][b][b][l][o0][n][d][e3]/i,
  ];

// Export the patterns for use in other modules
export { bannedWordsPatterns };