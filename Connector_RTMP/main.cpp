#undef DEBUG
#include <iostream>
#include <cstdlib>
#include <cstdio>
#include <cmath>

//needed for select
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>
#include <sys/types.h>
#include <unistd.h>

//for connection to server
#include "../sockets/SocketW.h"
bool ready4data = false;//set to true when streaming starts
bool inited = false;
bool stopparsing = false;
timeval lastrec;

#include "parsechunks.cpp" //chunkstream parsing
#include "handshake.cpp" //handshaking
#include "../util/flv_sock.cpp" //FLV parsing with SocketW

int main(){
  unsigned int ts;
  unsigned int fts = 0;
  unsigned int ftst;
  SWUnixSocket ss;
  fd_set pollset;
  struct timeval timeout;
  //0 timeout - return immediately after select call
  timeout.tv_sec = 1; timeout.tv_usec = 0;
  FD_ZERO(&pollset);//clear the polling set
  FD_SET(0, &pollset);//add stdin to polling set

  //first timestamp set
  firsttime = getNowMS();

  #ifdef DEBUG
  fprintf(stderr, "Doing handshake...\n");
  #endif
  if (doHandshake()){
    #ifdef DEBUG
    fprintf(stderr, "Handshake succcess!\n");
    #endif
  }else{
    #ifdef DEBUG
    fprintf(stderr, "Handshake fail!\n");
    #endif
    return 0;
  }
  #ifdef DEBUG
  fprintf(stderr, "Starting processing...\n");
  #endif
  while (std::cin.good() && std::cout.good()){
    //select(1, &pollset, 0, 0, &timeout);
    //only parse input from stdin if available or not yet init'ed
    //FD_ISSET(0, &pollset) || //NOTE: Polling does not work? WHY?!? WHY DAMN IT?!?
    if ((!ready4data || (snd_cnt - snd_window_at >= snd_window_size)) && !stopparsing){parseChunk();fflush(stdout);}
    if (ready4data){
      if (!inited){
        //we are ready, connect the socket!
        if (!ss.connect(streamname.c_str())){
          #ifdef DEBUG
          fprintf(stderr, "Could not connect to server!\n");
          #endif
          return 0;
        }
        FLV_Readheader(ss);//read the header, we don't want it
        #ifdef DEBUG
        fprintf(stderr, "Header read, starting to send video data...\n");
        #endif
        inited = true;
      }
      //only send data if previous data has been ACK'ed...
      if (snd_cnt - snd_window_at < snd_window_size){
        if (FLV_GetPacket(ss)){//able to read a full packet?
          ts = FLVbuffer[7] * 256*256*256;
          ts += FLVbuffer[4] * 256*256;
          ts += FLVbuffer[5] * 256;
          ts += FLVbuffer[6];
          if (ts != 0){
            if (fts == 0){fts = ts;ftst = getNowMS();}
            ts -= fts;
            FLVbuffer[7] = ts / (256*256*256);
            FLVbuffer[4] = ts / (256*256);
            FLVbuffer[5] = ts / 256;
            FLVbuffer[6] = ts % 256;
            ts += ftst;
          }else{
            ftst = getNowMS();
            FLVbuffer[7] = ftst / (256*256*256);
            FLVbuffer[4] = ftst / (256*256);
            FLVbuffer[5] = ftst / 256;
            FLVbuffer[6] = ftst % 256;
          }
          SendMedia((unsigned char)FLVbuffer[0], (unsigned char *)FLVbuffer+11, FLV_len-15, ts);
          FLV_Dump();//dump packet and get ready for next
        }
        if ((SWBerr != SWBaseSocket::ok) && (SWBerr != SWBaseSocket::notReady)){
          #ifdef DEBUG
          fprintf(stderr, "No more data! :-(  (%s)\n", SWBerr.get_error().c_str());
          #endif
          return 0;//no more input possible! Fail immediately.
        }
      }
    }
    //send ACK if we received a whole window
    if (rec_cnt - rec_window_at > rec_window_size){
      rec_window_at = rec_cnt;
      SendCTL(3, rec_cnt);//send ack (msg 3)
    }
  }
  #ifdef DEBUG
  fprintf(stderr, "User disconnected.\n");
  #endif
  return 0;
}//main
