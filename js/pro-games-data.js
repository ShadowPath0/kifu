// Bibliothèque commune de parties pro/historiques, embarquée dans le site (pas de backend :
// tout le monde sur le serveur Discord voit les mêmes parties sans rien importer).
// Pour en ajouter une : donner le SGF à Claude pour qu'il l'ajoute ici (source publique/domaine
// public de préférence — voir le commentaire "source" de chaque entrée).

const PRO_GAMES = [
  {
    id: "cho-hunhyeon-seo-pongsu-1989",
    title: "Cho Hun-hyeon vs Seo Pong-su — 14e Kiwang, finale (partie 1)",
    black: "Cho Hun-hyeon",
    blackRank: "9d",
    white: "Seo Pong-su",
    whiteRank: "9d",
    result: "W+21.5",
    date: "1989-12-20",
    event: "14th Kiwang Final, partie 1 (Hanguk Kiwon)",
    source: "fichier fourni par l'utilisateur",
    sgf: `(;GM[1]FF[4]CA[UTF-8]SZ[19]BR[9d]DT[1989-12-20]EV[14th Kiwang Final]KM[5.5]PB[Cho Hun-hyeon]PW[Seo Pong-su]RE[W+21.5]RO[Game 1]RU[Hanguk Kiwon]WR[9d];B[pd];W[dc];B[dq];W[pp];B[ce];W[ed];B[dg];W[cl];B[cj];W[co];B[cp];W[do];B[fq];W[cd];B[de];W[hd];B[qn];W[pk];B[on];W[nq];B[rp];W[qq];B[rk];W[nc];B[kd];W[qc];B[pc];W[qd];B[pe];W[pb];B[ob];W[qb];B[oc];W[qf];B[pf];W[qg];B[pg];W[ph];B[oh];W[pi];B[ic];W[ng];B[hc];W[ne];B[mf];W[nf];B[md];W[nd];B[mb];W[mc];B[lb];W[kf];B[eb];W[nb];B[na];W[gb];B[dd];W[ec];B[cc];W[cb];B[bd];W[gc];B[id];W[lc];B[kc];W[jb];B[ib];W[if];B[he];W[gd];B[ie];W[bb];B[lq];W[pm];B[pn];W[rq];B[dl];W[dm];B[dk];W[em];B[bl];W[mo];B[jp];W[mm];B[ql];W[rj];B[pl];W[ok];B[nm];W[ep];B[eq];W[go];B[hp];W[bp];B[bq];W[dp];B[cq];W[qk];B[nl];W[hg];B[ml];W[di];B[ci];W[dh];B[ch];W[gp];B[gq];W[in];B[fk];W[rl];B[rm];W[sk];B[je];W[mj];B[ol];W[cm];B[lh];W[mg];B[jf];W[kg];B[ih];W[jh];B[ii];W[ji];B[ij];W[ff];B[bk];W[eg];B[nr];W[mr];B[mq];W[or];B[np];W[ns];B[oq];W[nr];B[op];W[pq];B[lj];W[lk];B[kj];W[jj];B[kk];W[jk];B[mi];W[pa];B[oa];W[kl];B[ll];W[km];B[hl];W[mk];B[ni];W[nk];B[im];W[jm];B[hn];W[io];B[jo];W[lm];B[lo];W[ho];B[jn];W[ip];B[iq];W[mp];B[mn];W[hq];B[jq];W[og];B[bn];W[hr];B[lr];W[bo];B[bm];W[es];B[gr];W[gs];B[fs];W[fr];B[ds];W[dr];B[er];W[cs];B[fs];W[fp];B[fn];W[fr];B[cr];W[is];B[ir];W[js];B[ls];W[oo];B[ln];W[no];B[nn];W[bs];B[ds];W[gn];B[fm];W[dr];B[fs];W[ds];B[hs];W[el];B[hp];W[ek];B[ej];W[fl];B[hm];W[fj];B[ik];W[gk];B[jl];W[il];B[kh];W[jg];B[jl];W[ki];B[kn];W[li];B[dj];W[gm];B[bc];W[df];B[cg];W[ab];B[kl];W[ro];B[qo];W[qp];B[ee];W[fh];B[ef];W[ei];B[gi];W[fi];B[fe];W[ld];B[fd];W[fc];B[ig];W[hh];B[le];W[lf];B[gf];W[fg];B[db];W[rn];B[sn];W[sp];B[qe];W[re];B[hb];W[fb];B[gj];W[hi];B[hj];W[lp];B[kp];W[hf];B[hq];W[da];B[ge];W[me];B[ke];W[so];B[sm];W[ac];B[cn];W[ad];B[dn];W[en];B[ae];W[gl];B[ga];W[ea];B[aq];W[hk];B[an];W[kb];B[ma])`,
  },
  {
    id: "shin-jinseo-xie-ke-2026",
    title: "Shin Jinseo vs Xie Ke — Coupe Lanke de Quzhou, 2e tour",
    black: "Shin Jinseo (申眞ソ)",
    blackRank: "9d",
    white: "Xie Ke (謝科)",
    whiteRank: "9d",
    result: "B+R",
    date: "2026-04-15",
    event: "4e Coupe Lanke de Quzhou — World Go Open, 2e tour du tableau principal",
    source: "fichier fourni par l'utilisateur",
    sgf: `(;GM[1]FF[4]CA[UTF-8]SZ[19]BR[九段]DT[2026-04-15]EV[第4回衢州爛柯杯ワールド囲碁オープン本戦2回戦]KM[7.5]PB[申眞ソ]PW[謝科]RE[B+R]WR[九段];B[pd];W[cq];B[pq];W[dc];B[ce];W[qo];B[ed];W[ec];B[fd];W[gc];B[pm];W[iq];B[qp];W[pn];B[qm];W[rp];B[om];W[qr];B[rq];W[qq];B[pp];W[rr];B[ro];W[sq];B[hp];W[ip];B[ho];W[io];B[hn];W[jm];B[hq];W[dn];B[cl];W[gd];B[nc];W[dg];B[ff];W[el];B[dj];W[di];B[ci];W[ej];B[dh];W[ei];B[ch];W[eh];B[eg];W[cj];B[dk];W[bj];B[bi];W[aj];B[cg];W[ek];B[bm];W[fq];B[ep];W[fp];B[eo];W[eq];B[cp];W[fo];B[bq];W[dp];B[do];W[co];B[dq];W[en];B[dp];W[dr];B[bp];W[cm];B[cr];W[bl];B[hl];W[jk];B[hj];W[hr];B[ii];W[re];B[rd];W[qe];B[qd];W[qh];B[qi];W[ri];B[rj];W[qj];B[pi];W[rk];B[rh];W[sj];B[qg];W[rn];B[qn];W[so];B[ph];W[po];B[oo];W[on];B[nn];W[ro];B[nm];W[oj];B[np];W[mo];B[no];W[nk];B[lq];W[or];B[ko];W[in];B[lm];W[lc];B[gr];W[jr];B[hs];W[ir];B[gq];W[mq];B[mp];W[lr];B[nq];W[mr];B[if];W[cd];B[bd];W[bc];B[dd];W[cc];B[jc];W[nf];B[nh];W[kf];B[le];W[md];B[nd];W[ke];B[id];W[fg];B[df];W[he];B[ie];W[hg];B[ig];W[mh];B[ni];W[kh];B[ge];W[pf];B[of];W[oe];B[mg];W[ne];B[lg];W[lf];B[kg];W[ng];B[jg];W[pb];B[pc];W[kd];B[og];W[mb];B[nb];W[pe];B[kb];W[rb];B[rc];W[se];B[sg];W[sc];B[sd];W[od];B[oc];W[oa];B[na];W[ma];B[sb];W[qb];B[ob];W[qa];B[pa];W[lk];B[li];W[oa];B[kl];W[mc];B[pa];W[pg];B[oh];W[oa];B[fc];W[qc];B[pa];W[mj];B[mi];W[oa];B[dm];W[sc];B[cn];W[em];B[dl];W[hm];B[gm];W[il];B[im];W[ck];B[cm];W[hm];B[gk];W[kk];B[im];W[lo];B[oq];W[hm];B[fn];W[lp];B[kq];W[kp];B[jp])`,
  },
  {
    id: "mok-jinseok-lee-changho",
    title: "Mok Jinseok vs Lee Changho",
    black: "Mok Jinseok (목진석)",
    blackRank: "9d",
    white: "Lee Changho (이창호)",
    whiteRank: "9d",
    result: "B+R (au coup 119)",
    date: null,
    event: "Handicap 0, komi 6.5, temps de réflexion 1h (date non renseignée dans le SGF)",
    source: "fichier fourni par l'utilisateur",
    sgf: `(;GM[1]FF[4]CA[UTF-8]SZ[19]BR[9단]HA[0]KM[6.5]PB[목진석]PW[이창호]RE[119수 흑불계승]TM[1시간]WR[9단];B[qd];W[dp];B[pp];W[dc];B[ce];W[fd];B[di];W[oc];B[pe];W[ld];B[nq];W[qj];B[ql];W[qg];B[fq];W[cn];B[dq];W[cq];B[cr];W[br];B[dr];W[cp];B[ip];W[qn];B[qp];W[qb];B[nd];W[nc];B[og];W[rl];B[rm];W[qm];B[rk];W[pl];B[qk];W[pk];B[rj];W[qi];B[pm];W[oh];B[ng];W[on];B[om];W[nm];B[ol];W[pn];B[nl];W[oj];B[nn];W[mm];B[ml];W[no];B[mn];W[lm];B[ll];W[hp];B[hq];W[ln];B[mo];W[mp];B[lo];W[ko];B[lp];W[lq];B[kp];W[jp];B[kq];W[iq];B[km];W[ri];B[rn];W[hr];B[kn];W[go];B[fn];W[fo];B[nh];W[re];B[rd];W[qe];B[od];W[pc];B[pd];W[si];B[sl];W[rc];B[qc];W[rb];B[mc];W[md];B[lc];W[kc];B[kb];W[jc];B[nb];W[oa];B[jb];W[ic];B[ib];W[hb];B[se];W[ni];B[ob];W[pb];B[mb];W[la];B[lh];W[lf];B[ph];W[li];B[ki];W[sf];B[sd];W[pf];B[me];W[le];B[rf];W[mi];B[lg])`,
  },
  {
    id: "yi-changho-kim-suchang-2025",
    title: "Yi Ch'ang-ho vs Kim Su-chang — 2025 Legends League, playoffs (2e tour)",
    black: "Yi Ch'ang-ho",
    blackRank: "9d",
    white: "Kim Su-chang",
    whiteRank: "9d",
    result: "B+R",
    date: "2025-12-01",
    event: "2025 Legends League, Playoffs, Round 2",
    source: "fichier fourni par l'utilisateur",
    sgf: `(;GM[1]FF[4]CA[UTF-8]SZ[19]BR[9d]DT[2025-12-01]EV[2025 Legends League]KM[6.5]PB[Yi Ch'ang-ho]PW[Kim Su-chang]RE[B+R]RO[Playoffs, Round 2]WR[9d];B[qd];W[dd];B[pq];W[dp];B[oc];W[qo];B[qp];W[po];B[nq];W[pk];B[fc];W[ec];B[fd];W[df];B[jd];W[ph];B[ch];W[hc];B[hd];W[fb];B[gb];W[eb];B[cn];W[ck];B[gc];W[dn];B[dm];W[cm];B[do];W[en];B[co];W[eo];B[bm];W[cl];B[cp];W[dq];B[cq];W[dr];B[cr];W[eh];B[qg];W[ke];B[qh];W[kd];B[jc];W[jg];B[hg];W[bg];B[ip];W[op];B[oq];W[jo];B[io];W[in];B[hn];W[im];B[hm];W[il];B[jp];W[ko];B[fp];W[ep];B[kp];W[lo];B[el];W[ek];B[fk];W[ej];B[gl];W[fq];B[gq];W[gp];B[gr];W[go];B[fr];W[ho];B[fi];W[er];B[ei];W[di];B[fj];W[dh];B[eq];W[hq];B[hr];W[fq];B[ji];W[lp];B[lq];W[hl];B[gm];W[fo];B[np];W[bn];B[bl];W[bk];B[bo];W[ih];B[ij];W[hj];B[hk];W[ik];B[hi];W[ii];B[jj];W[gk];B[gj];W[hk];B[hh];W[lg];B[mh];W[lh];B[km];W[kl];B[li];W[ll];B[ni];W[mj];B[mi];W[nf];B[pi];W[nc];B[nn];W[nl];B[jk];W[jl];B[nd];W[md];B[mm];W[lm];B[ne];W[mb];B[nb];W[mc];B[ob];W[kc];B[qm];W[pm];B[ql];W[pl];B[qk];W[pj];B[qi];W[if];B[hf];W[ie];B[he];W[mq];B[lr];W[jr];B[ir];W[mr];B[mp];W[iq];B[kq];W[hp];B[kh];W[on];B[kg])`,
  },
];
